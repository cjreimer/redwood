import React, { useContext } from 'react'

import isEqual from 'lodash.isequal'

import { createNamedContext, ParamsContext, Spec } from './internal'

export interface PageLoadingContextInterface {
  loading: boolean
}

export const PageLoadingContext = createNamedContext<PageLoadingContextInterface>(
  'PageLoading'
)

export const usePageLoadingContext = () => {
  const pageLoadingContext = useContext(PageLoadingContext)

  if (!pageLoadingContext) {
    throw new Error(
      'usePageLoadingContext must be used within a PageLoadingContext provider'
    )
  }

  return pageLoadingContext
}

type synchonousLoaderSpec = () => { default: React.ComponentType }
interface State {
  Page?: React.ComponentType
  pageName?: string
  slowModuleImport: boolean
  params?: Record<string, string>
}

interface Props {
  spec: Spec
  delay?: number
  params?: Record<string, string>
}

export class PageLoader extends React.Component<Props> {
  state: State = {
    Page: undefined,
    pageName: undefined,
    slowModuleImport: false,
  }

  loadingTimeout?: number = undefined

  propsChanged = (p1: Props, p2: Props) => {
    if (p1.spec.name !== p2.spec.name) {
      return true
    }
    return !isEqual(p1.params, p2.params)
  }

  stateChanged = (s1: State, s2: State) => {
    if (s1.pageName !== s2.pageName) {
      return true
    }
    return !isEqual(s1.params, s2.params)
  }

  shouldComponentUpdate(nextProps: Props, nextState: State) {
    if (this.propsChanged(this.props, nextProps)) {
      this.clearLoadingTimeout()
      this.startPageLoadTransition(nextProps)
      return false
    }

    if (this.stateChanged(this.state, nextState)) {
      return true
    }

    return true
  }

  componentDidMount() {
    this.startPageLoadTransition(this.props)
  }

  announcementRef = React.createRef<HTMLDivElement>()

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.propsChanged(prevProps, this.props)) {
      this.clearLoadingTimeout()
      this.startPageLoadTransition(this.props)
    }

    if (this.stateChanged(prevState, this.state)) {
      // scroll, announce
      //------------------------
      // scrolls back to the top on `pushState` navigation
      // also seems to scroll back after `popState`,
      // but the browser sets it again afterward
      global?.scrollTo(0, 0)
      // @ts-ignore
      this.announcementRef.current.innerText = getAnnouncement()

      // focus
      //------------------------
      // const focusWrapper = global?.document.querySelectorAll(
      //   '[data-redwood-focus]'
      // )
      // if (focusWrapper.length) {
      //   // @ts-ignore
      //   focusWrapper[0].children[0].focus()
      // }
    }
  }

  clearLoadingTimeout = () => {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout)
    }
  }

  startPageLoadTransition = async (props: Props) => {
    const { spec, delay } = props
    const { loader, name } = spec

    // Update the context if importing the page is taking longer
    // than `delay`.
    // Consumers of the context can show a loading indicator
    // to signal to the user that something is happening.
    this.loadingTimeout = setTimeout(
      () => this.setState({ slowModuleImport: true }),
      delay
    )

    // Wait to download and parse the page.
    const module = await loader()

    // Remove the timeout because the page has loaded.
    this.clearLoadingTimeout()

    this.setState({
      pageName: name,
      Page: module.default,
      slowModuleImport: false,
      params: props.params,
    })
  }

  render() {
    const { Page } = this.state

    if (global.__REDWOOD__PRERENDERING) {
      // babel autoloader plugin uses withStaticImport in prerender mode
      // override the types for this condition
      const syncPageLoader = (this.props.spec
        .loader as unknown) as synchonousLoaderSpec
      const PageFromLoader = syncPageLoader().default

      return (
        <ParamsContext.Provider value={this.state.params}>
          <PageLoadingContext.Provider value={{ loading: false }}>
            <PageFromLoader {...this.state.params} />
          </PageLoadingContext.Provider>
        </ParamsContext.Provider>
      )
    }

    if (Page) {
      return (
        <ParamsContext.Provider value={this.state.params}>
          <PageLoadingContext.Provider
            value={{ loading: this.state.slowModuleImport }}
          >
            <Page {...this.state.params} />
            <div
              style={{
                position: `absolute`,
                width: 1,
                height: 1,
                padding: 0,
                overflow: `hidden`,
                clip: `rect(0, 0, 0, 0)`,
                whiteSpace: `nowrap`,
                border: 0,
              }}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              ref={this.announcementRef}
            ></div>
          </PageLoadingContext.Provider>
        </ParamsContext.Provider>
      )
    } else {
      return null
    }
  }
}

// announce
//------------------------
// the order of priority is:
// 1. RouteAnnouncement
// 2. h1
// 3. document.title
// 4. location.pathname
const getAnnouncement = (): string => {
  // do we need to watch out for `document` as well? b/c prerender?
  const routeAnnouncements = global?.document.querySelectorAll(
    '[data-redwood-route-announcement]'
  )
  const pageHeading = global?.document.querySelector(`h1`)

  if (routeAnnouncements.length) {
    // @ts-ignore
    return routeAnnouncements[routeAnnouncements.length - 1].innerText
  } else if (pageHeading) {
    return pageHeading.innerText
  } else if (global?.document.title) {
    return document.title
  } else {
    return `new page at ${global?.location.pathname}`
  }
}
