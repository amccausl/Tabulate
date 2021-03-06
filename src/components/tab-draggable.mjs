import {
  createDebug,
} from "../helpers.mjs"
import {
  getNewSelectedTabs,
} from "./helpers.mjs"

const debug = createDebug( "tabulate:components:tab-draggable" )
let drag_target = null
let drag_target_timer

function setTabTransferData( data_transfer, window_id, tabs ) {
  const tab_ids = tabs.map( tab => tab.id )
  const event_data = { window_id, tab_ids }
  data_transfer.effectAllowed = 'move'
  data_transfer.setData( "application/json", JSON.stringify( event_data ) )

  const text_data = tabs.map( tab => tab.url ).join( "\n" )
  data_transfer.setData( "text/uri-list", text_data )
  data_transfer.setData( "text/plain", text_data )
}

function setTabGroupTransferData( data_transfer, window_id, tab_group ) {
  const event_data = { window_id, tab_group_id: tab_group.id }
  data_transfer.effectAllowed = 'move'
  data_transfer.setData( 'application/json', JSON.stringify( event_data ) )
}

function getTransferType( event_data ) {
  if( event_data ) {
    if( event_data.type != null ) {
      if( event_data.type === 'moz-tab' ) {
        return 'tab'
      }
      if( event_data.type === 'moz-url' ) {
        return 'tab'
      }
      if( event_data.type === 'moz-place' ) {
        return 'tab'
      }
    }
    if( event_data.tab_ids != null ) {
      return 'tab'
    }
    if( event_data.tab_group_id != null ) {
      return 'tab_group'
    }
  }
  return null
}

function getLinks( moz_urls ) {
  const chunks = moz_urls.split( "\n" )
  const links = []
  const len = chunks.length
  for( let i = 0; i < len; i = i + 2 ) {
    links.push({ url: chunks[ i ].trim(), title: chunks[ i + 1 ] ? chunks[ i + 1 ].trim() : undefined })
  }
  return links
}

export function getTransferData( data_transfer ) {
  let event_data = null

  /*
  const count = data_transfer.mozItemCount
  for( let i = 0; i < count; i++ ) {
    const types = data_transfer.mozTypesAt( i )
    for( let t = 0; t < types.length; t++ ) {
      // console.info("  " + types[ t ] + ": ")
      try {
        const data = data_transfer.mozGetDataAt( types[ t ], i )
        // console.info("(" + (typeof data) + ") : <" + data + ">\n")
      } catch( ex ) {
        // console.info("<>\n")
        dump( ex )
      }
    }
  }
  */

 if( data_transfer.types.includes( 'text/x-moz-place' ) ) {
    // console.info('text/x-moz-place', data_transfer.getData( 'text/x-moz-place' ) )
    // From bookmarks, library
    if( data_transfer.getData( 'text/x-moz-place' ) ) {
      try {
        const moz_place = JSON.parse( data_transfer.getData( 'text/x-moz-place' ) )
        switch( moz_place.type ) {
          case "text/x-moz-place-container": // Bookmark folder
            event_data = {
              type: "moz-place",
              title: moz_place.title,
              links: getLinks( data_transfer.getData( "text/x-moz-url" ) )
            }
            // console.info('loading from bookmark folder', event_data)
            break
          case "text/x-moz-place": // Bookmark or URL bar
            event_data = {
              type: "moz-place",
              links: getLinks( data_transfer.getData( "text/x-moz-url" ) )
            }
            // console.info('loading from bookmark or URL bar', event_data)
            break
          default:
            // console.info('@todo')
        }
      } catch( ex ) {
        // @todo
        console.error( 'caught ex', ex )
      }
    } else {
      event_data = {
        type: "moz-place"
      }
      // console.info('loading from unknown', event_data)
    }
  } else if( data_transfer.types.includes( "text/x-moz-url" ) ) {
    // From link
    // console.info('text/x-moz-url', data_transfer.getData( 'text/x-moz-url' ) )
    event_data = {
      type: "moz-url",
      links: getLinks( data_transfer.getData( "text/x-moz-url" ) )
    }
    // console.info('loading from link', event_data)
  }
  // From Native Tab
  // if( data_transfer.types.includes( 'application/x-moz-tabbrowser-tab' ) ) {
  //   console.info('application/x-moz-tabbrowser-tab', data_transfer.getData( 'application/x-moz-tabbrowser-tab' ) )
  // }
  if( data_transfer.types.includes( "text/x-moz-text-internal" ) ) {
    event_data = { type: "moz-tab", url: data_transfer.getData( "text/x-moz-text-internal" ) }

    const count = data_transfer.mozItemCount
    if( count > 1 ) {
      event_data.urls = []
      for( let i = 0; i < count; i++ ) {
        delete event_data.url
        const types = data_transfer.mozTypesAt( i )
        for( let t = 0; t < types.length; t++ ) {
          if( types[ t ] === "text/x-moz-text-internal" ) {
            try {
              const data = data_transfer.mozGetDataAt( types[ t ], i )
              event_data.urls.push( data )
            } catch( ex ) {
              console.error( ex )
            }
          }
        }
      }
    }
    // console.info('text/x-moz-text-internal', event_data)
  }
  if( data_transfer.types.includes( "application/json" ) ) {
    // console.info('application/json', data_transfer.getData( "application/json" ) )
    try {
      event_data = JSON.parse( data_transfer.getData( "application/json" ) )
      // @todo should validate structure of json is expected
    } catch( ex ) {
      console.warn('problem parsing "application/json" type', data_transfer.getData( 'application/json' ))
    }
  }
  // From extension
  // @todo error guard

  return event_data
}

function getTabDragProperties( event, tab_group, tab ) {
  return {
    target: {
      tab_group_id: tab_group.id,
      tab_group_index: tab_group.tabs.indexOf( tab ),
      tab_id: tab.id,
    }
  }
}

function getTabGroupDragProperties( event, tab_group ) {
  return {
    target: {
      tab_group_new: ( tab_group == null ),
      tab_group_id: ( tab_group != null ? tab_group.id : null ),
      tab_group_index: null,
    }
  }
}

function resetDragState() {
  Object.assign( this.drag_state, { is_dragging: false, source: {}, target: {} } )
  this.selected_tab_ids.splice( 0, this.selected_tab_ids.length )
}

export function onTabDragStart( event, tab ) {
  // Use the selected tabs if the tab is selected
  let tabs
  if( this.isSelected( tab ) ) {
    tabs = getNewSelectedTabs( this.selected_tab_ids, this.tab_groups )
  } else {
    this.selected_tab_ids.splice( 0, this.selected_tab_ids.length, tab.id )
    tabs = [ tab ]
  }
  const tab_ids = tabs.map( tab => tab.id )
  setTabTransferData( event.dataTransfer, this.window_id, tabs )

  // Image is not available if this is a node process
  if( typeof Image != "undefined" ) {
    let drag_image = new Image()
    event.dataTransfer.setDragImage( drag_image, 10, 10 )
  }

  this.drag_state.is_dragging = true
  this.drag_state.source = {
    type: "tab",
    window_id: this.window_id,
    tab_ids
  }
}

export function onTabDragEnd() {
  resetDragState.call( this )
}

export function onTabDragEnter( event, tab_group, tab ) {
  const event_data = getTransferData( event.dataTransfer )
  const transfer_type = getTransferType( event_data )
  if( transfer_type === "tab" ) {
    drag_target = event.target
    event.dataTransfer.dropEffect = "move"
    Object.assign( this.drag_state, getTabDragProperties( event, tab_group, tab ) )
    event.preventDefault()
  } else {
    if( transfer_type === "tab_group" ) {
      Object.assign( this.drag_state.source, { type: "tab_group", tab_group_id: event_data.tab_group_id } )
    }
    event.dataTransfer.dropEffect = "none"
  }
}

export function onTabDragLeave( event ) {
  // Leave is fired after the new enter, so detect if this is still the active group
  if( drag_target === event.target ) {
    this.drag_state.target = {}
  }
}

export function onTabDrop( event, tab_group, tab ) {
  const event_data = getTransferData( event.dataTransfer )
  const transfer_type = getTransferType( event_data )
  if( transfer_type === "tab" ) {
    const target_data = {
      window_id: this.window_id,
      tab_group_id: tab_group.id,
      tab_group_index: tab_group.tabs.indexOf( tab )
    }

    window.background.moveTabsToGroup( window.store, event_data, target_data )
    // @todo consider removing this
    this.selected_tab_ids.splice( 0, this.selected_tab_ids.length )
  }
  resetDragState.call( this )
}

export function onTabGroupDragStart( event, tab_group ) {
  this.drag_state.is_dragging = true
  this.drag_state.source = {
    type: 'tab_group',
    tab_group_id: tab_group.id
  }
  setTabGroupTransferData( event.dataTransfer, this.window_id, tab_group )
}

export function onTabGroupDragEnd() {
  debug( 'onTabGroupDragEnd' )
  resetDragState.call( this )
}

export function onTabGroupDragEnter( event, tab_group, tab_group_index, type ) {
  debug( 'onTabGroupDragEnter', event, tab_group, tab_group_index, type )
  clearTimeout( drag_target_timer )
  const event_data = getTransferData( event.dataTransfer )
  const transfer_type = getTransferType( event_data )
  if( transfer_type != null ) {
    drag_target = event.target
    event.dataTransfer.dropEffect = 'move'
    switch( transfer_type ) {
      case 'tab_group':
        Object.assign( this.drag_state, getTabGroupDragProperties( event, tab_group ) )
        if( type === "dropzone" ) {
          this.drag_state.target.tab_group_last = true
        } else if( type === "action_new" ) {
          this.drag_state.target = { window_new: true }
        }
        this.drag_state.source.type = 'tab_group'
        this.drag_state.tab_group_index = tab_group_index
        break
      case 'tab':
        Object.assign( this.drag_state, getTabGroupDragProperties( event, tab_group ) )
        this.drag_state.source.type = 'tab'
        if( tab_group != null && ! tab_group.open ) {
          drag_target_timer = setTimeout(
            () => {
              tab_group.open = true
            },
            2000
          )
        }
        break
    }
    event.preventDefault()
  }
  debug( 'this.drag_state', JSON.stringify( this.drag_state, null, 2 ) )
}

export function onTabGroupDragLeave( event ) {
  // Leave is fired after the new enter, so detect if this is still the active group
  if( drag_target === event.target ) {
    clearTimeout( drag_target_timer )
    Object.assign( this.drag_state, { target: {} } )
  }
}

export function onTabGroupDrop( event, tab_group, tab_group_index, type ) {
  const event_data = getTransferData( event.dataTransfer )
  const transfer_type = getTransferType( event_data )
  debug( 'onTabGroupDrop', event_data )
  debug( 'this.drag_state', JSON.stringify( this.drag_state, null, 2 ) )
  if( transfer_type != null ) {
    event.preventDefault()
    resetDragState.call( this )
    switch( transfer_type ) {
      case "tab_group": {
        if( type === "action_new" ) {
          return window.background.moveTabGroup( window.store, event_data, { window_new: true } )
        }
        const target_data = {
          window_id: this.window_id,
          tab_group_index
        }
        return window.background.moveTabGroup( window.store, event_data, target_data )
      }
      case "tab": {
        if( tab_group == null ) {
          return window.background.createGroup( window.store, this.window_id, event_data )
            .then( tab_group => this.renameTabGroup( tab_group.id ) )
        }
        const target_data = {
          window_id: this.window_id,
          tab_group_id: tab_group ? tab_group.id : null
        }
        return window.background.moveTabsToGroup( window.store, event_data, target_data )
      }
    }
  }
}
