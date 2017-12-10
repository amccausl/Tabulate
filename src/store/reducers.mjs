import {
  INIT,
  WINDOW_ADD,
  WINDOW_REMOVE,
  GROUP_CREATE,
  GROUP_REMOVE,
  GROUP_UPDATE,
  GROUP_MOVE,
  TAB_ACTIVATE,
  TAB_ADD,
  TAB_REMOVE,
  TAB_UPDATE,
  TAB_MOVE,
  TAB_ATTACH,
  TAB_DETACH,
} from './action-types.mjs'

import {
  createWindow,
  createTabGroup,
  getNewTabGroupId,
} from './helpers.mjs'

const initial_state = {
  orphan_tabs: [],
  windows: []
}

function findTabWindowId( windows, tab_id ) {
  let window = windows.find( window => window.tab_groups.some( tab_group => tab_group.tabs.some( tab => tab.id === tab_id ) ) )
  if( window ) {
    return window.id
  }
  return null
}

function _removeTab( state, { tab_id, window_id, index, is_detach } ) {
  // @todo use index to optimize the lookup process if set
  let orphan_tab = null

  const windows = state.windows.map( window => {
    if( window.id !== window_id ) {
      return window
    }
    return Object.assign( {}, window, {
      tab_groups: window.tab_groups.map( tab_group => {
        const tab_index = tab_group.tabs.findIndex( tab => tab.id === tab_id )
        if( tab_index > -1 ) {
          tab_group = Object.assign( {}, tab_group, {
            tabs: [ ...tab_group.tabs ],
            tabs_count: tab_group.tabs_count - 1
          })
          orphan_tab = tab_group.tabs.splice( tab_index, 1 )[ 0 ]
        }
        return tab_group
      })
    })
  })

  const new_state = Object.assign( {}, state, {
    windows
  })

  if( is_detach && orphan_tab ) {
    new_state.orphan_tabs = [ ...new_state.orphan_tabs, orphan_tab ]
  }

  return new_state
}

export function init( state, { tabs, window_tab_groups_map } ) {
  const window_tabs_map = new Map()

  // @todo use persist state from window_tab_groups_map

  // new_tab_group_id the largest id + 1
  let new_tab_group_id = 1
  // @todo iterate window_tab_groups_map to get id

  tabs.forEach( ( tab ) => {
    let window_tabs = window_tabs_map.get( tab.windowId )
    if( ! window_tabs ) {
      window_tabs = []
      window_tabs_map.set( tab.windowId, window_tabs )
    }
    window_tabs.push( tab )
  })

  const windows = []
  for( let [ window_id, window_tabs ] of window_tabs_map.entries() ) {
    // @todo ensure tabs are in index sorted order
    // Clone tabs to use as iterator
    window_tabs = [ ...window_tabs ]
    let window_tab_groups = []
    let window_tab_groups_state = window_tab_groups_map.get( window_id )
    if( window_tab_groups_state ) {
      for( let tab_group_state of window_tab_groups_state ) {
        window_tab_groups.push({
          id: tab_group_state.id,
          title: tab_group_state.title,
          tabs: window_tabs.splice( 0, tab_group_state.tabs_count ),
          tabs_count: tab_group_state.tabs_count
        })
      }
    } else {
      // No state, assign all tabs to new groups
      window_tab_groups.push( createTabGroup( new_tab_group_id, window_tabs ) )
      new_tab_group_id++
    }

    windows.push({
      id: window_id,
      active_tab_group_id: window_tab_groups[ 0 ].id,
      tab_groups: window_tab_groups
    })
  }

  const init_state = {
    orphan_tabs: initial_state.orphan_tabs,
    windows
      /*
      id,
      active_tab_group_id,
      tab_groups: [
        {
          id,
          name,
          active_tab_id,
          tabs,
        }
      ]
      */
  }

  // @todo compare with state to return optimized diff

  return init_state
}

export function addWindow( state, { window } ) {
  // Check if there are any orphan_tabs that below to this window
  let tabs = []
  let orphan_tabs = state.orphan_tabs
  if( orphan_tabs.length > 0 ) {
    tabs = state.orphan_tabs.filter( tab => tab.windowId === window.id )
    orphan_tabs = orphan_tabs.filter( tab => tab.windowId !== window.id )
  }

  return Object.assign( {}, state, {
    orphan_tabs,
    windows: [
      ...state.windows,
      createWindow( window.id, [
        createTabGroup( getNewTabGroupId( state ), tabs )
      ])
    ]
  })
}

export function removeWindow( state, { window_id } ) {
  return Object.assign( {}, state, {
    windows: state.windows.filter( window => window.id !== window_id )
  })
}

export function createGroup( state, { window_id } ) {
  const new_tab_group = createTabGroup( getNewTabGroupId( state ), [] )
  return Object.assign( {}, state, {
    windows: state.windows.map( window => {
      if( window.id !== window_id ) {
        return window
      }
      return Object.assign( {}, window, {
        tab_groups: [ ...window.tab_groups, new_tab_group ]
      })
    })
  })
}

export function removeGroup( state, { tab_group_id, window_id } ) {
  return state
}

export function updateGroup( state, { tab_group, window_id, change_info } ) {
  return state
}

export function moveGroup( state, { tab_group_id, window_id, index } ) {
  return state
}

export function activateTab( state, { tab_id, window_id } ) {
  // @todo optimize to return existing state if tab already active
  return Object.assign( {}, state, {
    windows: state.windows.map( window => {
      if( window.id === window_id ) {
        window = Object.assign( {}, window, {
          tab_groups: window.tab_groups.map( tab_group => {
            // If tab_group contains an active tab or the tab_id, return a copy with active toggled
            if( tab_group.tabs.some( tab => tab.active || tab.id === tab_id ) ) {
              tab_group = Object.assign( {}, tab_group, {
                tabs: tab_group.tabs.map( tab => {
                  if( tab.id === tab_id ) {
                    return Object.assign( {}, tab, {
                      active: true
                    })
                  }
                  if( tab.active ) {
                    return Object.assign( {}, tab, {
                      active: false
                    })
                  }
                  return tab
                })
              })
            }
            return tab_group
          })
        })
      }
      return window
    })
  })
}

export function addTab( state, { tab } ) {
  let is_window_defined = false
  const windows = state.windows.map( window => {
    if( window.id !== tab.windowId ) {
      return window
    }

    is_window_defined = true
    let i = 0
    return Object.assign( {}, window, {
      tab_groups: window.tab_groups.map( tab_group => {
        if( 0 <= tab.index - i && tab.index - i <= tab_group.tabs_count ) {
          // @todo if next tab_group is empty, add tab to it instead
          tab_group = Object.assign( {}, tab_group, {
            tabs: [ ...tab_group.tabs ],
            tabs_count: tab_group.tabs_count + 1
          })
          tab_group.tabs.splice( tab.index - i, 0, tab )
        }
        i += tab_group.tabs_count
        return tab_group
      })
    })
  })

  // If the window for the new tab doesn't exist yet, add to orphaned
  let orphan_tabs = state.orphan_tabs
  if( ! is_window_defined ) {
    orphan_tabs = [
      ...orphan_tabs,
      tab
    ]
  }

  return Object.assign( {}, state, {
    orphan_tabs,
    windows
  })
}

export function removeTab( state, { tab_id, window_id } ) {
  return _removeTab( state, { tab_id, window_id, is_detach: false } )
}

export function updateTab( state, { tab, change_info } ) {
  // @todo change use the nature of change_info to ignore changes
  return Object.assign( {}, state, {
    windows: state.windows.map( window => {
      if( window.id !== tab.windowId ) {
        return window
      }
      return Object.assign( {}, window, {
        tab_groups: window.tab_groups.map( tab_group => {
          const tab_index = tab_group.tabs.findIndex( _tab => _tab.id === tab.id )
          if( tab_index > -1 ) {
            tab_group = Object.assign( {}, tab_group, {
              tabs: [ ...tab_group.tabs ]
            })
            tab_group.tabs[ tab_index ] = tab
          }
          return tab_group
        })
      })
    })
  })
}

export function moveTab( state, { tab_id, window_id, index, tab_group_id } ) {
  return Object.assign( {}, state, {
    windows: state.windows.map( window => {
      if( window.id !== window_id ) {
        return window
      }

      let moved_tab = null

      const tab_groups = window.tab_groups.map( tab_group => {
        const tab_index = tab_group.tabs.findIndex( tab => tab.id === tab_id )
        if( tab_index > -1 ) {
          tab_group = Object.assign( {}, tab_group, {
            tabs: [ ...tab_group.tabs ]
          })
          moved_tab = tab_group.tabs.splice( tab_index, 1 )[ 0 ]
          tab_group.tabs_count--
        }
        return tab_group
      })

      // Scan tab_groups to find place to move tab to
      if( moved_tab ) {
        for( let i = 0, j = 0; j < tab_groups.length; j++ ) {
          if( tab_group_id != null ) {
            // If the tab_group_id is passed, override behaviour
            if( tab_groups[ j ].id === tab_group_id ) {
              tab_groups[ j ] = Object.assign( {}, tab_groups[ j ], {
                tabs: [ ...tab_groups[ j ].tabs ],
                tabs_count: tab_groups[ j ].tabs_count + 1
              })
              tab_groups[ j ].tabs.splice( index - i, 0, moved_tab )
            }
          } else {
            // Otherwise determine group by index
            if( index - i <= tab_groups[ j ].tabs_count ) {
              tab_groups[ j ] = Object.assign( {}, tab_groups[ j ], {
                tabs: [ ...tab_groups[ j ].tabs ],
                tabs_count: tab_groups[ j ].tabs_count + 1
              })
              tab_groups[ j ].tabs.splice( index - i, 0, moved_tab )
              break
            }
          }
          i += tab_groups[ j ].tabs_count
        }
      }

      return Object.assign( {}, window, {
        tab_groups
      })
    })
  })
}

export function attachTab( state, { tab_id, window_id, index } ) {
  let tab_index = state.orphan_tabs.findIndex( tab => tab.id === tab_id )
  if( tab_index === -1 ) {
    // If the tab that is being detached is the last in the window, the attach event is fired before the detach, scan for tab in windows
    const tab_window_id = findTabWindowId( state.windows, tab_id )
    if( tab_window_id == null ) {
      // @todo error
      return state
    }
    state = detachTab( state, { tab_id, window_id: tab_window_id } )
    tab_index = state.orphan_tabs.findIndex( tab => tab.id === tab_id )
  }

  const orphan_tabs = [ ...state.orphan_tabs ]
  const tab = Object.assign( {}, orphan_tabs.splice( tab_index, 1 )[ 0 ], {
    windowId: window_id,
    index
  })

  return Object.assign( addTab( state, { tab } ), {
    orphan_tabs
  })
}

export function detachTab( state, { tab_id, window_id, index } ) {
  return _removeTab( state, { tab_id, window_id, index, is_detach: true } )
}

export default function App( state = initial_state, action ) {
  switch( action.type ) {
    case INIT:
      return init( state, action )
    case WINDOW_ADD:
      return addWindow( state, action )
    case WINDOW_REMOVE:
      return removeWindow( state, action )
    case GROUP_CREATE:
      return createGroup( state, action )
    case GROUP_REMOVE:
      return removeGroup( state, action )
    case GROUP_UPDATE:
      return updateGroup( state, action )
    case GROUP_MOVE:
      return moveGroup( state, action )
    case TAB_ACTIVATE:
      return activateTab( state, action )
    case TAB_ADD:
      return addTab( state, action )
    case TAB_REMOVE:
      return removeTab( state, action )
    case TAB_UPDATE:
      return updateTab( state, action )
    case TAB_MOVE:
      return moveTab( state, action )
    case TAB_ATTACH:
      return attachTab( state, action )
    case TAB_DETACH:
      return detachTab( state, action )
    default:
      return state
  }
}
