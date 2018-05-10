<template>
  <div :class="bem( `tab-search`, { theme } )">
    <label :class="[ `tab-search__label` ]">
      <svg :class="[ `tab-search__icon` ]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <path d="M15.707 14.293l-4.822-4.822a6.019 6.019 0 1 0-1.414 1.414l4.822 4.822a1 1 0 0 0 1.414-1.414zM6 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"></path>
      </svg>
      <input :class="[ `tab-search__input` ]" type="search" v-model="search_text" @input="onUpdateSearchText" :placeholder="__MSG_tab_search_placeholder__"/>
      <svg :class="[ `tab-search__clear-icon` ]" @click="clearSearchText()" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M6.586 8l-2.293 2.293a1 1 0 0 0 1.414 1.414L8 9.414l2.293 2.293a1 1 0 0 0 1.414-1.414L9.414 8l2.293-2.293a1 1 0 1 0-1.414-1.414L8 6.586 5.707 4.293a1 1 0 0 0-1.414 1.414L6.586 8zM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0z"></path>
      </svg>
    </label>
  </div>
</template>

<script>
import {
  getWindow,
} from '../store/helpers.mjs'
import {
  bem,
  debounce,
  onStateChange,
} from "./helpers.mjs"

export default {
  name: "tab-search",
  props: [ "theme" ],
  data() {
    return {
      search_text: '',
      search_resolved: true,
      window_id: window.current_window_id,
    }
  },
  computed: {
    __MSG_tab_search_placeholder__() {
      return window.background.getMessage( "tab_search_placeholder" )
    }
  },
  created() {
    onStateChange( state => {
      const state_window = getWindow( state, this.window_id )
      if( state_window.search != null ) {
        this.search_text = state_window.search.text
        this.search_resolved = state_window.search.resolved
      } else {
        this.search_text = ""
        this.search_resolved = true
      }
    })
  },
  methods: {
    bem,
    onUpdateSearchText: debounce( function() {
      console.info('runSearch', this.search_text)
      window.background.runTabSearch( window.store, this.window_id, this.search_text )
    }, 250 ),
    clearSearchText() {
      console.info('clearSearchText', this.search_text)
      this.search_text = ""
      window.background.runTabSearch( window.store, this.window_id, this.search_text )
    },
  }
}
</script>

<style lang="scss">
@import "../styles/photon";

$dark-awesome-bar-background: #474749;

$tab-search__theme: (
  light: (
    --background-color: $white-100,
    --color: $grey-90,
    --border-color: #ccc,
  ),
  dark: (
    --background-color: $dark-awesome-bar-background,
    --color: $white-100,
    --border-color: $dark-awesome-bar-background,
  )
);

.tab-search {
  flex: 1;
  padding: 4px 0 4px 4px;

  &__label {
    position: relative;
  }

  &__input {
    @extend %text-body-10;
    width: 100%;
    height: 30px;
    padding-left: 28px;
    border: 1px solid $grey-90-a30;
    border-radius: 4px;

    &::-moz-placeholder {
      @extend %text-body-10;
    }
  }

  &__label:hover &__input {
    border-color: $grey-90-a50;
  }

  &__icon {
    opacity: 0.4;
    height: 16px;
    width: 16px;
    position: absolute;
    left: 8px;
    top: 0;
  }

  &__clear-icon {
    @extend %slow-transition;
    transition-property: opacity;
    opacity: 0.4;
    height: 16px;
    width: 16px;
    position: absolute;
    right: 8px;
    top: 0;
    cursor: pointer;
  }

  &__input:placeholder-shown + &__clear-icon {
    display: none;
    opacity: 0;
  }
}

@each $theme, $colors in $tab-search__theme {
  .tab-search {
    &--theme-#{$theme} &__input {
      background-color: map-get( $colors, --background-color );
      color: map-get( $colors, --color );

      &::-moz-placeholder {
        color: map-get( $colors, -icon--color );
      }
    }

    &--theme-#{$theme} &__icon {
      fill: map-get( $colors, --color );
    }

    &--theme-#{$theme} &__clear-icon {
      fill: map-get( $colors, --color );
    }
  }
}
</style>