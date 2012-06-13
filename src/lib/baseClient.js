//this is the base module. it is the basis for specific modules, and deals with coordinating the cache, events from other tabs, and all wire traffic with the cloud
define(['./session'], function (session) {
  function create(moduleName, syncInterval) {
    var handlers = { change: []},
      prefix = 'remote_storage_cache:';
    function fire(eventName, eventObj) {
      if(handlers[eventName]) {
        for(var i=0; i<handlers[eventName].length; i++) {
          handlers[eventName][i](eventObj);
        }
      }
    }
    function forThisModule(e) {
      return (e && e.path && typeof(e.path) == 'string' && (
        e.path.substring(0, moduleName.length+1) == moduleName+'/'
        ||e.path.substring(0, 'public/'.length+moduleName.length+1) == 'public/'+moduleName+'/'
      ));
    }
    window.addEventListener('storage', function(e) {
      if(e.key.substring(0, prefix.length == prefix)) {
        e.path = e.key.substring(prefix.length);
        e.origin='device';
      }
      if(forThisModule(e)) {
        fire(e);
      }
    });
    function cacheGet(path) {
      var valueStr = localStorage.getItem(prefix+path);
      if(path.substr(-1) == '/') {
        if(valueStr) {
          try {
            var value = JSON.parse(valueStr);
          } catch(e) {
            fire('error', e);
          }
        } else {
          return {};
        }
      } else {
        return valueStr;
      }
    }
    function cacheSet(path, valueStr) {
      return localStorage.setItem(prefix+path, valueStr);
    }
    function cacheRemove(path) {
      return localStorage.removeItem(prefix+path);
    }
    function on(eventName, cb) {
      if(eventName=='change') {
        handlers.change.push(cb);
      }
    }
    function getPrivate(path) {
      return cacheGet(moduleName+'/'+path);
    }
    function getPublic(path) {
      return cacheGet('public/'+moduleName+'/'+path);
    }
    function setPrivate(path, valueStr) {
      return set(moduleName+'/'+path, valueStr);
    }
    function setPublic(path, valueStr) {
      return set('public/'+moduleName+'/'+path, valueStr);
    }
    function set(absPath, valueStr) {
      session.notifySet(absPath, valueStr, function(err) {
        if(err) {
          fire('error', err);
        }
      });
      fire('change', {
        origin: 'tab',
        path: absPath,
        oldValue: cacheGet(absPath),
        newValue: valueStr
      });
      return cacheSet(absPath, valueStr);
    }
    function removePrivate(path) {
      remove(moduleName+'/'+path);
    }
    function removePublic(path) {
      remove('public/'+moduleName+'/'+path);
    }
    function remove(path) {
      session.notifyRemove(absPath, function(err) {
        if(err) {
          fire('error', err);
        }
      });
      fire('change', {
        origin: 'tab',
        path: absPath,
        oldValue: cacheGet(absPath),
        newValue: undefined
      });
      return cacheRemove(absPath);
    }
    function push(path) {
      if(path.substr(-1) == '/') {
        doSync(path);
      } else {
        session.notifySet(path, cacheGet(path));
      }
    }
    function pull(path) {
      if(key.substr(-1) == '/') {
        sync(path);
      } else {
        session.getRemote(path, function(err, data) {
          if(err) {
            fire('error', err);
          } else {
            cacheSet(path, data);
          }
        });
      }
    }
    function doMerge(path, localIndex, remoteIndex) {
      for(var key in localIndex) {
        if(localIndex[key] > remoteIndex[key]) {
          push(path+'/'+key);
        }
      }
      for(var key in remoteIndex) {
        if(remoteIndex[key] > localIndex[key]) {
          pull(path+'/'+key);
        }
      }
    }
    function doSync(path) {
      session.remoteGet(path, function(err, data) {
        if(err) {
          fire('error', err);
        } else {
          doMerge(path, cacheGet(path), data);
        }
      });
    }
    function syncPrivate(path) {
      doSync(moduleName+'/'+path);
    }
    function syncPublic(path) {
      doSync('public/'+moduleName+'/'+path);
    }
    
    return {
      on: on,//error,change(origin=tab,device,cloud)
      
      getPrivate    : getPrivate,
      setPrivate    : setPrivate,
      removePrivate : removePrivate,
      syncPrivate   : syncPrivate,

      getPublic    : getPublic,
      setPublic    : setPublic,
      removePublic : removePublic,
      syncPublic   : syncPublic
    };
  }
  
  return {
    create: create
  };
});
