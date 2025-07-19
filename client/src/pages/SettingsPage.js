import { useEffect, useRef, useState } from 'react';

function SettingsPage() {
  const [ytsubsApiKey, setYtsubsApiKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [excludeShorts, setExcludeShorts] = useState(false);
  const [postProcessors, setPostProcessors] = useState([]);
  const [message, setMessage] = useState('');

  const [editingPostProcessor, setEditingPostProcessor] = useState(null);

  const defaultWebhook = {
    name: '',
    type: 'webhook',
    target: '',
    data: "{\"method\":\"GET\"}", // Todo
  };

  useEffect(() => {
    // --------- TEMP -----------
    setPostProcessors([{
      id: 1,
      name: 'Discord',
      type: 'webhook',
      target: 'https://discord.com/api/webhooks/858876913476435988/w7U2WDO0wZAGPYyDbuw9ksQtp8HHlUTBjZyvkr3xefD2XkV1sEtT5HpDrytg8dz0zrWu',
      data: "{\"method\":\"POST\",\"body\":\"{\\\"embeds\\\":[{\\\"title\\\":\\\"New Video: [[video.title]]\\\",\\\"url\\\":\\\"https://www.youtube.com/watch?v=[[video.video_id]]\\\",\\\"thumbnail\\\":{\\\"url\\\":\\\"[[video.thumbnail]]\\\"},\\\"timestamp\\\":\\\"[[video.published_at]]\\\",\\\"color\\\":\\\"0xff0000\\\",\\\"footer\\\":{\\\"text\\\":\\\"From playlist: [[playlist.title]]\\\"}}]}\"}", // Todo
    }]);
    // --------- TEMP -----------

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setYtsubsApiKey(data.ytsubs_apikey ?? '');
        setWebhookUrl(data.webhook_url ?? '');
        setExcludeShorts((data.exclude_shorts ?? 'false') === 'true'); // SQLite can't store bool
      })
      .catch(err => {
        console.error('Failed to fetch settings', err);
      });
  }, []);

  const handleSave = async () => {
    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      setMessage('Invalid webhook URL');
      return;
    }
  
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ //Todo: since 'GET api/settings' returns a single object with pairs like 'webhook_url: value', we should save it in the same way
          key: 'webhook_url',
          value: webhookUrl,
        },
        {
          key: 'ytsubs_apikey',
          value: ytsubsApiKey,
        },
        {
          key: 'exclude_shorts',
          value: String(excludeShorts), // SQLite can't store bool
        }]),
      });
  
      if (!res.ok)
        throw new Error('Failed to save settings');
      
      setMessage('Saved settings'); //Todo: use a notification toast (or maybe something more sonarr-like) instead of alert
    } catch (err) {
      console.error(err);
      setMessage('Error saving settings'); //Todo: use a notification toast (or maybe something more sonarr-like) instead of alert
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0px 20px', gap: 10, backgroundColor: '#262626', height: 60 }}>
        {/* Todo: highlight button icon on color (maybe not red though?) */}
        <button
          onClick={handleSave}
          title="Save Settings"
        >
          <i className="bi bi-floppy-fill"/>
          <div style={{fontSize: 'small'}}>Save</div>
        </button>
      </div>
      <div style={{padding: 30}}>
        <div style={{fontWeight: 'bold', fontSize: 'xx-large'}}>
          Settings
        </div>
        <div className='setting'>
          <div style={{minWidth: 175}}>YTSubs.app API key</div>
          <input type="text"
            value={ytsubsApiKey}
            onChange={e => setYtsubsApiKey(e.target.value)}
          />
        </div>
        <div className='setting'>
          {/* Todo: maybe instead of just "exclude shorts", we could let users choose from one of these prefixes: https://stackoverflow.com/a/77816885*/}
          <div style={{minWidth: 175}}>Exclude shorts</div>
          <label className='container'>
            <div style={{fontSize: 'small', textAlign: 'center'}}>Whether to exclude shorts videos from playlists</div>
            <input type='checkbox' checked={excludeShorts} onChange={e => setExcludeShorts(e.target.checked)}/>
            <span className="checkmark"></span>
          </label>
        </div>
        {/* Todo: eventually, I think "Post Processors" should be a separate page under Settings (like Sonarr's "Connect") */}
        <div style={{marginTop: 50, fontWeight: 'bold', fontSize: 'xx-large'}}>
          Post Processors
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          padding: '10px'
        }}>
          {postProcessors.map(postProcessor =>
            <div key={postProcessor.id} className='playlist-card' /* Todo: make this class more generic */ style={{padding: 10, margin: 10}}>
              <button onClick={() => setEditingPostProcessor(postProcessor /* Todo: make an object copy of postProcessor*/)} style={{display: 'flex', flexDirection: 'column', alignItems: 'start', width: '100%', height: '100%'}}>
                <h3 style={{fontSize: 'x-large', margin: '0 0 5px 0',}}>{postProcessor.name}</h3>
                <div style={{display: 'flex', backgroundColor: 'var(--accent-color)', padding: 5, margin: 10, gap: 5, borderRadius: 2}}>
                  <i style={{fontSize: 'medium'}} className={`bi bi-${postProcessor.type === 'webhook' ? 'broadcast' : 'cpu-fill'}`}/>
                  <div style={{fontSize: 'small'}}>{postProcessor.type}</div>
                </div>
              </button>
            </div>
          )}
          <div className='playlist-card' style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, margin: 10}}>
            <button style={{width: '100%', height: '100%'}} onClick={() => setEditingPostProcessor(defaultWebhook)}>
              <i style={{fontSize: 'xx-large'}} className="bi bi-plus-square"/>
            </button>
          </div>
        </div>
        <br />
        {message && (
          <p style={{ marginTop: '10px', color: message.includes('Invalid') || message.includes('Error') ? 'red' : 'lightgreen' }}>
            {message}
          </p>
        )}
        <PostProcessorDialog editingItem={editingPostProcessor} onClose={() => setEditingPostProcessor(null)}/>
      </div>
    </div>
  );
}

function PostProcessorDialog({editingItem, onClose}) {
  const [postProcessor, setPostProcessor] = useState(null);
  const [postProcessorData, setPostProcessorData] = useState(null);
  const [message, setMessage] = useState(null);
  const postProcessorTypes = [
    'webhook',
    // 'process', // Todo: support 'process'
  ];

  useEffect(() => {
    console.log('editingItem:', editingItem)
    if (editingItem) {
      const copy = JSON.parse(JSON.stringify(editingItem)); // Create deep copy of editingItem
      setPostProcessor(copy);
      setPostProcessorData(JSON.parse(copy.data));
      dialogRef.current?.showModal();
    }
    else {
      setPostProcessor(null);
      setPostProcessorData(null);
      setMessage(null);
      dialogRef.current?.close();
    }
  }, [editingItem]);

  const handleDelete = () => {
    // Todo: make request to server
    onClose();
  };

  const handleSave = () => {
    if (postProcessorData.body) {
      try {
        JSON.parse(postProcessorData.body); // Validate the body is valid json
      } catch (err) {
        setMessage(`Invalid JSON Body: ${err.message}`);
        return;
      }
    }

    const result = {
      ...postProcessor,
      data: JSON.stringify(postProcessorData),
    };
    console.log('handleSave:', result); // TODO: send to server
    onClose();
  };
  
  const handleCancel = () => {
    onClose();
  };

  const dialogRef = useRef();

  return (
    <dialog ref={dialogRef} style={{width: 720 /* Todo: need mobile sizing */, borderRadius: 6, padding: 0, borderWidth: 0, maxHeight: '90%', color: 'inherit', overflow: 'hidden'}}>
      {/* Todo: have a "template" selector (that can auto-populate for things like Discord, Pushbullet, etc) */}
      <div style={{display: 'flex'}}>
        <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: '#2a2a2a', width: '100%'}}>
          <button style={{position: 'absolute', top: 0, right: 0, width: 60, height: 60}} onClick={() => handleCancel()}>
            <i style={{fontSize: 'xx-large'}} className="bi bi-x"/>
          </button>
          <h3 style={{padding: '15px 50px 15px 30px', borderBottom: '1px solid grey', width: '100%', margin: 0}}>Edit Connection - {postProcessor?.name || 'New'}</h3>
          <div style={{padding: 30}}>{/* Todo: scrollable */}
            <div className='setting' /* Todo: might want to use a slightly different styling here */>
              <div style={{minWidth: 175}}>Name</div>
              <input type="text"
                value={postProcessor?.name}
                onChange={e => setPostProcessor({...postProcessor, name: e.target.value})}
              />
            </div>
            <div className='setting' /* Todo: might want to use a slightly different styling here */>
              <div style={{minWidth: 175}}>Type</div>
              <div>
                <select
                  value={postProcessor?.type}
                  onChange={e => setPostProcessor({...postProcessor, type: e.target.value})}>
                  {postProcessorTypes.map(type =>
                    <option key={type} value={type}>{type}</option>
                  )}
                </select>
                <div style={{fontSize: 'small', color: 'yellow', marginTop: 5, fontStyle: 'italic'}}>*Only webhook is supported for now - processes (like yt-dlp) will be supported later</div>
              </div>
            </div>
            <div className='setting' /* Todo: might want to use a slightly different styling here */>
              <div style={{minWidth: 175}}>{postProcessor?.type === 'webhook' ? 'URL' : 'File path'}</div>
              <input type="text"
                value={postProcessor?.target}
                onChange={e => setPostProcessor({...postProcessor, target: e.target.value})}
              />
            </div>
            {postProcessorData ?
            <>
              <div className='setting' /* Todo: might want to use a slightly different styling here */>
                <div style={{minWidth: 175}}>Method</div>
                <select
                  value={postProcessorData.method}
                  onChange={e => setPostProcessorData({...postProcessorData, method: e.target.value})}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(type =>
                    <option key={type} value={type}>{type}</option>
                  )}
                </select>
              </div>
              <div className='setting' /* Todo: might want to use a slightly different styling here */>
                <div style={{minWidth: 175}}>Body</div>
                <div>
                  <textarea
                    value={postProcessorData.body}
                    onChange={e => setPostProcessorData({...postProcessorData, body: e.target.value})}
                  />
                  <div>f(x)</div>
                </div>
              </div>
            </>
            : null}
            {message && (
              <p style={{ marginTop: '10px', color: 'red' }}>
                {message}
              </p>
            )}
          </div>
          <div style={{padding: '15px 30px', display: 'flex'}}>
            {/* Todo: it looks like these buttons are inheriting "empty button" styles from elsewhere in the app - I should separate those with a class or something better*/}
            {/* Todo: need button hover indicator */}
            <button onClick={() => handleDelete()} style={{backgroundColor: '#f04b4b', fontSize: 'medium', padding: '6px 16px', borderRadius: 4, marginRight: 'auto'}}>Delete</button>
            {/* Todo: add a "Test" button to make a request to the server to perform a test */}
            <button onClick={() => handleCancel()} style={{backgroundColor: '#393f45', fontSize: 'medium', padding: '6px 16px', borderRadius: 4, marginLeft: 10}}>Cancel</button>
            <button onClick={() => handleSave()} style={{backgroundColor: '#393f45', fontSize: 'medium', padding: '6px 16px', borderRadius: 4, marginLeft: 10}}>Save</button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export default SettingsPage;