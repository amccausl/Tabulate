import tap from "tap"

import {
  createTestTab
} from "../helpers.mjs"
import {
  createWindow,
  createTabGroup,
  createPinnedTabGroup,
} from "../../../src/store/helpers.mjs"
import {
  activateGroup,
} from "../../../src/store/reducers/group.mjs"
import {
  validateState,
} from "../../../src/store/validators.mjs"

tap.test( async function testNormalActivate( t ) {
  let state0 = {
    config: {},
    windows: [
      createWindow( 1, [
        createPinnedTabGroup( [] ),
        createTabGroup( 2, [
          createTestTab({
            id: 4
          }),
          createTestTab({
            id: 5
          }),
        ]),
        createTabGroup( 3, [
          createTestTab({
            id: 6
          }),
          createTestTab({
            id: 7
          }),
        ]),
      ]),
    ]
  }

  state0 = activateGroup( state0, { window_id: state0.windows[ 0 ].id, tab_group_id: 2 } )
  t.ok( validateState( state0 ), "should pass validation", validateState.errors )
})

tap.test( async function testActivateMissingGroup(t) {
  let state0 = {
    config: {},
    windows: [
      createWindow( 1, [
        createPinnedTabGroup( [] ),
        createTabGroup( 2, [
          createTestTab({
            id: 4
          }),
          createTestTab({
            id: 5
          }),
        ]),
        createTabGroup( 3, [
          createTestTab({
            id: 6
          }),
          createTestTab({
            id: 7
          }),
        ]),
      ]),
    ]
  }

  state0 = activateGroup( state0, { window_id: state0.windows[0].id, tab_group_id: 1 } )
  t.ok( validateState( state0 ), "should pass validation", validateState.errors )
})
