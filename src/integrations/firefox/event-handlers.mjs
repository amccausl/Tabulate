import {
  addWindowAction,
  removeWindowAction,
  activateTabAction,
  addTabAction,
  removeTabAction,
  updateTabAction,
  updateTabImageAction,
  moveTabAction,
  attachTabAction,
  updateConfigAction,
} from "../../store/actions.mjs"
import {
  default_config,
  findTab,
  getCreateTabTarget,
  getSourceTabGroupData,
} from "../../store/helpers.mjs"

import {
  moveTabsToGroup,
  setTabGroupId,
} from "./index.mjs"

// @todo pull to shared file
const LOCAL_CONFIG_KEY = "config"

/**
 * Bind change events for the browser to dispatch operations on the store
 * @param store The redux store
 */
export function bindBrowserEvents( store ) {
  // @todo need way to turn off console

  // This would be required for integration with other extensions
  // browser.runtime.onMessage.addListener( ( message, sender, sendResponse ) => {
  //   console.info('runtime.onMessage', message, sender, sendResponse)
  // })

  browser.sessions.onChanged.addListener( () => {
    console.info('sessions.onChanged')
  })

  browser.storage.onChanged.addListener( ( changes, area ) => {
    console.info('storage.onChanged', area, changes)
    onStorageChanged( store, changes, area )
  })

  // Attach listeners for changes to windows

  browser.windows.onCreated.addListener( ( browser_window ) => {
    console.info('windows.onCreated', browser_window)
    if( browser_window.type === 'normal' ) {
      onWindowCreated( store, browser_window )
    }
  })

  browser.windows.onRemoved.addListener( ( window_id ) => {
    console.info('windows.onRemoved', window_id)
    onWindowRemoved( store, window_id )
  })

  // Attach listeners for changes to tabs

  browser.tabs.onActivated.addListener( ( { tabId, windowId } ) => {
    console.info('tabs.onActivated', tabId, windowId)
    onTabActivated( store, tabId, windowId )
  })

  browser.tabs.onCreated.addListener( ( browser_tab ) => {
    console.info('tabs.onCreated', browser_tab)
    onTabCreated( store, browser_tab )
  })

  browser.tabs.onRemoved.addListener( ( tab_id, { windowId, isWindowClosing } ) => {
    console.info('tabs.onRemoved', tab_id, windowId)
    onTabRemoved( store, tab_id, windowId )
  })

  browser.tabs.onMoved.addListener( ( tab_id, { windowId, fromIndex, toIndex } ) => {
    onTabMoved( store, tab_id, windowId, toIndex )
  })

  browser.tabs.onAttached.addListener( ( tab_id, { newWindowId, newPosition } ) => {
    console.info('tabs.onAttached', tab_id, newWindowId, newPosition)
    store.dispatch( attachTabAction( tab_id, newWindowId, newPosition ) )
  })

  browser.tabs.onDetached.addListener( ( tab_id, { oldWindowId, oldPosition } ) => {
    console.info('tabs.onDetached', tab_id, oldWindowId, oldPosition)
  })

  browser.tabs.onReplaced.addListener( ( added_tab_id, removed_tab_id ) => {
    console.info('tabs.onReplaced', added_tab_id, removed_tab_id)
    // @todo
  })

  browser.tabs.onUpdated.addListener( ( tab_id, change_info, browser_tab ) => {
    onTabUpdated( store, tab_id, change_info, browser_tab )
  })

  if( browser.contextualIdentities ) {
    browser.contextualIdentities.onCreated.addListener( ( { contextualIdentity } ) => {
      console.info('contextualIdentities.onCreated', contextualIdentity)
    })

    browser.contextualIdentities.onUpdated.addListener( ( { contextualIdentity } ) => {
      console.info('contextualIdentities.onUpdated', contextualIdentity)
    })

    browser.contextualIdentities.onRemoved.addListener( ( { contextualIdentity } ) => {
      console.info('contextualIdentities.onRemoved', contextualIdentity)
    })
  }

  store.subscribe( () => {
    const state = store.getState()
    if( browser.tabs.show && browser.tabs.hide ) {
      console.info('updating tab show state')
      const show_ids = []
      const hide_ids = []
      const updates = []

      for( let window of state.windows ) {
        // @todo check for noop
        for( let tab_group of window.tab_groups ) {
          if( tab_group.hasOwnProperty( 'pinned' ) ) {
            continue
          }
          if( window.active_tab_group_id === tab_group.id ) {
            show_ids.push( ...tab_group.tabs.map( tab => tab.id ) )
          } else {
            // @todo pin tab if hide not possible
            hide_ids.push( ...tab_group.tabs.map( tab => tab.id ) )
          }
        }
        break
      }
      if( hide_ids.length ) {
        console.info(`browser.tabs.hide( ${ JSON.stringify( hide_ids ) } )`)
        updates.push( browser.tabs.hide( hide_ids ) )
        // updates.push( ...hide_ids.map( tab_id => browser.tabs.update( tab_id, { autoDiscardable: true } ) ) )
      }
      if( show_ids.length ) {
        console.info(`browser.tabs.show( ${ JSON.stringify( show_ids ) } )`)
        updates.push( browser.tabs.show( show_ids ) )
        // updates.push( ...show_ids.map( tab_id => browser.tabs.update( tab_id, { autoDiscardable: false } ) ) )
      }
    }
  })
}


export function onStorageChanged( store, changes, area ) {
  if( area === 'local' && changes[ LOCAL_CONFIG_KEY ] ) {
    store.dispatch( updateConfigAction( changes[ LOCAL_CONFIG_KEY ].newValue || default_config ) )
  }
}

export function onWindowCreated( store, browser_window ) {
  store.dispatch( addWindowAction( browser_window ) )
}

export function onWindowRemoved( store, window_id ) {
  store.dispatch( removeWindowAction( window_id ) )
}

export function onTabActivated( store, tab_id, window_id ) {
  store.dispatch( activateTabAction( tab_id, window_id ) )

  // Start background task to get preview image
  // NOTE: Not needed at the moment, disabled for now
  // browser.tabs.captureVisibleTab( windowId, TAB_PREVIEW_IMAGE_DETAILS )
  //   .then( preview_image_uri => {
  //     store.dispatch( updateTabImageAction( tabId, windowId, preview_image_uri ) )
  //     const tab = findTab( store.getState(), windowId, tabId )
  //     if( tab && tab.preview_image ) {
  //       setTabPreviewState( tab.id, tab.preview_image )
  //     }
  //   })
}

export function onTabCreated( store, browser_tab ) {
  const state = store.getState()
  const { index } = getCreateTabTarget( state, browser_tab )
  if( browser_tab.index !== index ) {
    console.info('tabs.move', [ browser_tab.id ], { index })
    browser.tabs.move( [ browser_tab.id ], { index } )
  }

  return store.dispatch( addTabAction( browser_tab ) )
}

export function onTabUpdated( store, tab_id, change_info, browser_tab ) {
  const state = store.getState()
  // If change_info.audible && tab_group.muted, mute tab
  if( change_info.hasOwnProperty( 'audible' ) ) {
    for( let window of state.windows ) {
      if( window.id !== browser_tab.windowId ) {
        continue
      }
      for( let tab_group of window.tab_groups ) {
        if( ! tab_group.tabs.some( tab => tab.id === tab_id ) ) {
          continue
        }
        if( change_info.audible && tab_group.muted ) {
          browser.tabs.update( tab_id, { muted: true } )
        }
        break
      }
      break
    }
  }
  // @todo should omit ignored properties and check if result is empty instead
  if( change_info.hasOwnProperty( 'isArticle' ) ) {
    return
  }
  if( change_info.hasOwnProperty( 'sharingState' ) ) {
    return
  }
  if( change_info.hasOwnProperty( 'hidden' ) ) {
    return
  }
  console.info(`onTabUpdated( tab_id=${ tab_id }, change_info=${ JSON.stringify( change_info ) } )`, browser_tab)
  store.dispatch( updateTabAction( browser_tab, change_info ) )
}

export function onTabRemoved( store, tab_id, window_id ) {
  // @todo if this was the last tab in the group, activate the next group
  store.dispatch( removeTabAction( tab_id, window_id ) )
}

export function onTabMoved( store, tab_id, window_id, index ) {
  console.info(`onTabMoved( tab_id=${ tab_id }, window_id=${ window_id }, index=${ index } )`)
  store.dispatch( moveTabAction( tab_id, window_id, index ) )
}
