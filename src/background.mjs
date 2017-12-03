import { createStore } from 'redux'

import { loadInitialState } from './store/index.mjs'
import App from './store/reducers.mjs'

window.process = { env: { NODE_ENV: 'production' } }

function onError( error ) {
  console.error( error )
}

const TAB_GROUP_ID_SESSION_KEY = 'tab_group_id'
const WINDOW_ACTIVE_GROUP_ID_SESSION_KEY = 'active_tab_group_id'

window.store = new Promise( ( resolve, reject ) => {
  // browser.windows.getAll( { populate: true, windowTypes: [ 'normal' ] } )
  //   .then(
  //     ( windows ) => {
  //       console.info('windows', windows)
  //     },
  //     onError
  //   )

  browser.storage.onChanged.addListener( ( changes, area ) => {
    console.info('storage.onChanged', area, changes)
  })

  // Clear the storage
  // browser.storage.local.clear()

  browser.storage.local.get( null )
    .then(
      ( results ) => {
        console.info('storage.local.get', results)
      },
      onError
    )

  // Attach listeners for changes to tabs

  browser.tabs.onCreated.addListener( ( tab ) => {
    console.info('tabs.onCreated', tab)
    // @todo find active group for window
    // @todo
  })

  browser.tabs.onRemoved.addListener( ( tab_id, remove_info ) => {
    // @todo can start process to capture image here
    console.info('tabs.onRemoved', tab_id, remove_info)
  })

  browser.tabs.onMoved.addListener( ( tab_id, { windowId, fromIndex, toIndex } ) => {
    // @todo can start process to capture image here
    console.info('tabs.onMoved', tab_id, windowId, fromIndex, toIndex)
  })

  browser.tabs.onAttached.addListener( ( tab_id, { newWindowId, newPosition } ) => {
    console.info('tabs.onAttached', tab_id, newWindowId, newPosition)
  })

  browser.tabs.onDetached.addListener( ( tab_id, { oldWindowId, oldPosition } ) => {
    console.info('tabs.onDetached', tab_id, oldWindowId, oldPosition)
  })

  browser.tabs.onReplaced.addListener( ( added_tab_id, removed_tab_id ) => {
    console.info('tabs.onReplaced', added_tab_id, removed_tab_id)
  })

  browser.tabs.onUpdated.addListener( ( tab_id, change_info, tab ) => {
    console.info('tabs.onUpdated', tab_id, change_info, tab)
  })

  // @todo use browser.sessions.setTabValue( tab_id, key, value ) to store

  browser.tabs.onActivated.addListener( ( { tabId, windowId } ) => {
    // @todo can start process to capture image here
    // tabs.captureVisibleTab()
    console.info('tabs.onActivated', tabId, windowId)
  })

  // @todo add webNavigation permission if this is required
  // browser.webNavigation.onCompleted.addListener( ( event ) => {
  //   // Filter out any sub-frame related navigation event
  //   if( event.frameId !== 0 ) {
  //     return
  //   }

  //   const url = new URL( event.url )
  //   console.info('webNavigation.onCompleted', event)
  // })

  // This would be required for integration with other extensions
  // browser.runtime.onMessage.addListener( ( message, sender, sendResponse ) => {
  //   console.info('runtime.onMessage', message, sender, sendResponse)
  // })

  let tab_groups = []
  let tab_group_ids = []
  let window_active_tab_group_ids = []
  const window_ids = []

  // @todo document structure for storage.local.tab_groups?

  let tabs

  Promise.all([
    browser.storage.local.get( [ 'tab_groups' ] ),
    browser.tabs.query( {} )
  ]).then(
    ( [ storage_values, _tabs ] ) => {
      if( storage_values.tab_groups ) {
        tab_groups = storage_values.tab_groups
        console.info('tab_groups', tab_groups)
      }

      tabs = _tabs
      console.info('tabs', tabs)

      tabs.forEach( ( tab ) => {
        tab_group_ids.push( browser.sessions.getTabValue( tab.id, TAB_GROUP_ID_SESSION_KEY ) )
        if( window_ids.indexOf( tab.windowId ) === -1 ) {
          window_ids.push( tab.windowId )
          window_active_tab_group_ids.push( browser.sessions.getWindowValue( tab.windowId, WINDOW_ACTIVE_GROUP_ID_SESSION_KEY ) )
        }
      })

      return Promise.all( [ Promise.all( tab_group_ids ), Promise.all( window_active_tab_group_ids ) ] )
    }
  ).then(
    ( [ tab_group_ids, window_active_tab_group_ids ] ) => {
      console.info('tab_group_ids', tab_group_ids)
      console.info('window_active_tab_group_ids', window_active_tab_group_ids)

      // @todo populate maps
      const tab_group_id_map = new Map()
      const window_active_tab_group_id_map = new Map()

      const initial_state = loadInitialState({ tabs, tab_groups, tab_group_id_map, window_active_tab_group_id_map })

      // browser.storage.local.set( { state } )
      resolve( createStore( App, initial_state ) )
    }
  ).catch( ( err ) => {
    console.error( 'error', err )
    reject( err )
  })

  // @todo load from storage
  // @todo sync changes
})
