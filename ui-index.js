const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const template = fs.readFileSync('./ui-index-template.html').toString()

module.exports = async (rootPath, moduleInfo, documentationPath, sitemap) => {
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="ui"', 'class="active"')
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} UI index`
  }]
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} UI index`
  }]
  if (sitemap.examples && sitemap.examples.length) {
    HTML.renderList(doc, sitemap.examples, 'route-template', 'example-routes-list')
  } else {
    const container = doc.getElementById('example-container')
    container.parentNode.removeChild(container)
  }
  const guest = []
  const user = []
  const administrator = []
  for (const key in sitemap.urls) {
    if (key === '/') {
      continue
    }
    if (key.indexOf('/api/') > -1 || key.indexOf('/webhooks/') > -1) {
      continue
    }
    if (moduleInfo.urlStem && key.indexOf(moduleInfo.urlStem) === -1) {
      continue
    }
    sitemap.urls[key].object = 'route'
    sitemap.urls[key].title = key.split('/').pop().split('-').join(' ')
    sitemap.urls[key].title = sitemap.urls[key].title.charAt(0).toUpperCase() + sitemap.urls[key].title.substring(1)
    if (sitemap.urls[key].screenshots) {
      for (const file of sitemap.urls[key].screenshots) {
        if (file.indexOf('-submit-form-') > -1) {
          sitemap.urls[key].src = file
          break
        }
        if (file.indexOf('-complete-') > -1) {
          sitemap.urls[key].src = file
          break
        }
      }
    }
    if (key.startsWith('/account/')) {
      user.push(sitemap.urls[key])
    } 
    if (key.startsWith('/administrator/')) {
      administrator.push(sitemap.urls[key])
    }
    if (sitemap.urls[key].authDescription) {
      guest.push(sitemap.urls[key])
    }
  }
  if (guest && guest.length) {
    HTML.renderList(doc, guest, 'route-template', 'guest-routes-list')
  } else {
    const container = doc.getElementById('guest-container')
    container.parentNode.removeChild(container)
  }
  if (user && user.length) {
    HTML.renderList(doc, user, 'route-template', 'user-routes-list')
  } else {
    const container = doc.getElementById('user-container')
    container.parentNode.removeChild(container)
  }
  if (administrator && administrator.length) {
    HTML.renderList(doc, administrator, 'route-template', 'administrator-routes-list')
  } else {
    const container = doc.getElementById('administrator-container')
    container.parentNode.removeChild(container)
  }
  HTML.applyImageSRI(doc)
  const html = beautify(doc.toString(), {
    indent_size: 2,
    space_in_empty_paren: true
  })
  let uiFile
  if (moduleInfo.moduleName.startsWith('@')) {
    uiFile = moduleInfo.moduleName.split('/').pop() + '-ui.html'
  } else {
    uiFile = moduleInfo.moduleName + '-ui.html'
  }
  fs.writeFileSync(`${documentationPath}/${uiFile}`, html)
}
