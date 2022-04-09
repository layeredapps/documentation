const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const template = fs.readFileSync('./api-index-template.html').toString()

module.exports = async (rootPath, moduleInfo, documentationPath, api) => {
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="api"', 'class="active"')
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} API index`
  }]
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} API index`
  }]
  const userRoutes = []
  const administratorRoutes = []
  for (const url in api) {
    let nodejs = 'global' + url.split('/').join('.')
    const parts = nodejs.split('.').pop().split('-')
    nodejs = nodejs.substring(0, nodejs.lastIndexOf('.') + 1)
    for (const i in parts) {
      nodejs += parts[i].charAt(0).toUpperCase() + parts[i].substring(1)
    }
    const urlParameters = []
    const postParameters = []
    if (api[url].receives && api[url].receives.length) {
      for (const parameter of api[url].receives) {
        let truncated = parameter
        if (truncated.indexOf(' (') > -1) {
          truncated = truncated.substring(0, truncated.indexOf(' ('))
        }
        if (parameter.indexOf('posted') > -1) {
          postParameters.push({
            object: 'parameter',
            name: truncated.substring(truncated.lastIndexOf(' ') + 1)
          })
        } else {
          urlParameters.push({
            object: 'parameter',
            name: truncated.substring(truncated.lastIndexOf(' ') + 1)
          })
        }
      }
    }
    urlParameters.sort()
    postParameters.sort()
    let data
    if (url.indexOf('/api/administrator/') > -1) {
      data = administratorRoutes
    } else {
      data = userRoutes
    } 
    const id = administratorRoutes.length + userRoutes.length
    data.push({
      object: 'route',
      id,
      verb: api[url].verb,
      nodejs,
      url,
      urlParameters,
      postParameters
    })
  }
  const removeList = []
  if (userRoutes.length) {
    HTML.renderList(doc, userRoutes, 'route-row-template', 'user-routes-table')
  } else {
    removeList.push('user-container')
  }
  if (administratorRoutes.length) {
    HTML.renderTable(doc, administratorRoutes, 'route-row-template', 'administrator-routes-table')
  } else {
    removeList.push('administrator-container')
  }
  const allRoutes = userRoutes.concat(administratorRoutes)
  for (const route of allRoutes) {
    if (route.urlParameters && route.urlParameters.length) {
      route.urlParameters.sort((a, b) => {
        return a.name < b.name ? -1 : 1
      })
      HTML.renderList(doc, route.urlParameters, 'parameter-item-template', `url-parameters-${route.id}`)
    } else {
      removeList.push(`url-container-${route.id}`)
    }
    if (route.postParameters && route.postParameters.length) {
      route.postParameters.sort((a, b) => {
        return a.name < b.name ? -1 : 1
      })
      HTML.renderList(doc, route.postParameters, 'parameter-item-template', `post-parameters-${route.id}`)
    } else {
      removeList.push(`post-container-${route.id}`)
    }
  }
  for (const id of removeList) {
    console.log(id)
    const element = doc.getElementById(id)
    element.parentNode.removeChild(element)
  }
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  const apiFile = moduleInfo.moduleName.split('/').pop() + '-api.html'
  fs.writeFileSync(`${documentationPath}/${apiFile}`, `<!doctype html>${html}`)
}
