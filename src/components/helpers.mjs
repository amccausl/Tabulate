
import {
  getMessage
} from '../integrations/index.mjs'

/**
 * Delay execution of function, use only most recent args.  Works to wrap method on component
 * @param fn Function to delay
 * @param delay MS to delay
 */
export function debounce( fn, delay ) {
  let timeout_id = null
  return function() {
    clearTimeout( timeout_id )
    const args = arguments
    timeout_id = setTimeout(
      () => fn.apply( this, args ),
      delay
    )
  }
}

/**
 * Helper to pull the plural/singular version of a key
 * @param key The base localization key for the message
 * @param count The count for the property
 */
export function getCountMessage( key, count ) {
  return getMessage( `${ key }_count_${ count === 1 ? 'singular' : 'plural' }`, [ count ] )
}

/**
 * Helper to get a more user-friendly url
 * @param uri_string
 */
export function getFriendlyUrlText( uri_string ) {
  try {
    const url = new URL( uri_string )
    let url_text = ''

    // Return full path for about pages
    if( url.protocol === 'about:' ) {
      return url.href
    }

    // Ignore common protocols
    if( ! [ 'https:', 'http:' ].includes( url.protocol ) ) {
      url_text += url.protocol + '//'
    }

    // Strip leading www. (not really helpful)
    url_text += url.host.startsWith( 'www.' ) ? url.host.substr( 4 ) : url.host

    // @todo add as much of url and args as makes sense
    if( url.pathname !== '/' ) {
      url_text += '/…'
    }
    return url_text
  } catch( ex ) {
    // @todo error handling
    console.error( 'getFriendlyUrlText exception', ex )
    return null
  }
}

/**
 * Get a markdown string rendering for a tab group
 * @param tab_group
 */
export function getTabGroupCopyText( tab_group ) {
  let copy_text = `## ${ tab_group.title }`
  tab_group.tabs.forEach( tab => {
    copy_text += `\n- [${ tab.title }](${ tab.url })`
  })
  return copy_text
}

/**
 * Subscribe to changes from the store and add cleanup on window
 * @param fn
 */
export function onStateChange( fn ) {
  fn( window.store.getState() )

  // Attach listener to background state changes so we can update the data
  const unsubscribe = window.store.subscribe( () => {
    fn( window.store.getState() )
  })
  window.addEventListener( 'unload', ( event ) => {
    unsubscribe()
  })
}
