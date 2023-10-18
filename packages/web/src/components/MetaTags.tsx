import React from 'react'

import { Head as HelmetHead } from '../index'

// Ideally we wouldn't include this for non experiment builds
// But.... not worth the effort to remove it from bundle atm
import PortalHead from './PortalHead'

// type RobotsParams =
//   | 'noindex'
//   | 'index'
//   | 'follow'
//   | 'nofollow'
//   | 'none'
//   | 'noarchive'
//   | 'nocache'
//   | 'nosnippet'
// interface MetaTagsProps {
//   /**
//    * @description
//    * og:image by default
//    */
//   tag?: `og:${string}`

//   /**
//    * @description
//    * website by default. See https://ogp.me/#types
//    */
//   ogType?: string
//   ogWidth?: string
//   ogHeight?: string

//   locale?: string

//   /**
//    * @description
//    * Link to image/video to display when unfurled
//    **/
//   ogContentUrl?: string

//   /**
//    * @description
//    * The url to link back to. This must be a canonical (absolute) URL.
//    * Use `ogContentUrl` to set the actual image to be displayed
//    **/
//   ogUrl?: `${'http://' | 'https://'}${string}`
//   contentType?: string

//   /**
//    * @description
//    * String or array of strings to provide crawlers instructions for how to crawl or index web page content.
//    **/
//   robots?: RobotsParams | RobotsParams[]
//   title?: string
//   description?: string
//   author?: string

//   /**
//    * @description
//    * Any additional metatags
//    */
//   children?: React.ReactNode
// }

const propToMetaTag = (
  parentKey: string,
  parentValue: Array<unknown> | Record<string, unknown> | string,
  options: { attr: 'name' | 'property' }
) => {
  if (Array.isArray(parentValue)) {
    // array of attributes
    return parentValue.map((value) => {
      return propToMetaTag(parentKey, value, options)
    })
  } else if (typeof parentValue === 'object') {
    // namespaced attributes, <meta> name attribute changes to 'property'
    return Object.entries(parentValue).map(([key, value]) => {
      return propToMetaTag(`${parentKey}:${key}`, value, { attr: 'property' })
    })
  } else {
    // plain text
    const attributes = { [options['attr']]: parentKey, content: parentValue }
    return <meta {...attributes} />
  }
}

/**
 * Add commonly used <meta> tags for unfurling/seo purposes
 * using the open graph protocol https://ogp.me/
 * @example
 * <MetaTags title="About Page" ogContentUrl="/static/about-og.png"/>
 */
export const MetaTags = (props: Record<string, any>) => {
  const { children, ...metaProps } = props

  let Head: typeof HelmetHead | typeof PortalHead = HelmetHead

  if (process.env.NODE_ENV === 'test' || RWJS_ENV.RWJS_EXP_STREAMING_SSR) {
    Head = PortalHead
  }

  const tags = Object.entries(metaProps)
    .map(([key, value]) => {
      return propToMetaTag(key, value, { attr: 'name' })
    })
    .flat()

  return (
    <Head>
      {tags.map((tag, i) => (
        <React.Fragment key={i}>{tag}</React.Fragment>
      ))}
      {children}
    </Head>
  )

  // return (
  //   <>
  //     {title && (
  //       <Head>
  //         <title>{title}</title>
  //         <meta property="og:title" content={title} key="title" />
  //         <meta property="twitter:title" content={title} />
  //       </Head>
  //     )}

  //     {description && (
  //       <Head>
  //         <meta name="description" content={description} />
  //         <meta name="twitter:description" content={description} />
  //         <meta property="og:description" content={description} />
  //       </Head>
  //     )}

  //     {author && (
  //       <Head>
  //         <meta name="author" content={author} />
  //         <meta name="twitter:site" content={author} />
  //         <meta name="twitter:creator" content={author} />
  //       </Head>
  //     )}

  //     {ogUrl && (
  //       <Head>
  //         <meta property="og:url" content={ogUrl} />
  //       </Head>
  //     )}

  //     {/* en_US by default */}
  //     {locale && (
  //       <Head>
  //         <html lang={locale} />
  //         <meta property="og:locale" content={locale} />
  //       </Head>
  //     )}

  //     <Head>
  //       <meta property="og:type" content={ogType} />
  //     </Head>

  //     {ogContentUrl && (
  //       <Head>
  //         <meta property={tag} content={ogContentUrl} />
  //       </Head>
  //     )}

  //     {contentType && (
  //       <Head>
  //         <meta property={`${tag}:type`} content={contentType} />
  //       </Head>
  //     )}

  //     {tag === 'og:image' && (
  //       <Head>
  //         {ogWidth && <meta property="image:width" content={ogWidth} />}
  //         {ogHeight && <meta property="image:height" content={ogHeight} />}
  //         <meta property="twitter:card" content="summary_large_image" />
  //         <meta property="twitter:image" content={ogContentUrl} />
  //       </Head>
  //     )}

  //     {robots && (
  //       <Head>
  //         <meta
  //           name="robots"
  //           content={Array.isArray(robots) ? robots.join(', ') : robots}
  //         />
  //       </Head>
  //     )}

  //     {children}
  //   </>
  // )
}
