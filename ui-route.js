const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const path = require('path')
const template = fs.readFileSync('./ui-route-template.html').toString()

module.exports = async (rootPath, moduleInfo, documentationPath, page) => {
  if( !page.screenshots) {
    return
  }
  let embeddedPath
  if (moduleInfo.moduleName === '@layeredapps/dashboard') {
    embeddedPath = ''
  } else if (moduleInfo.moduleName === '@layeredapps/organizations') {
    embeddedPath = '/organizations'
  } else if (moduleInfo.moduleName === '@layeredapps/maxmind-geoip') {
    embeddedPath = ''
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-connect') {
    embeddedPath = '/connect'
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-subscriptions') {
    embeddedPath = '/subscriptions'
  } else {
    embeddedPath = ''
  }
  let prependPath = ''
  if (moduleInfo.moduleName === 'example-web-app') {
    prependPath = 'example-web-app/'
  } else if (moduleInfo.moduleName === 'example-subscription-web-app') {
    prependPath = 'example-subscription-web-app/'
  }
  let pageTitle = moduleInfo.title
  if (pageTitle.indexOf('${') > -1) {
    pageTitle = pageTitle.substring(0, pageTitle.lastIndexOf('.'))
    pageTitle = pageTitle.replace('${', '')
  }
  const folderName = page.url === '/' ? 'index' : page.url.split('/').pop()
  const administrator = page.url.indexOf('/administrator') > -1
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="ui"', 'class="active"')
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: moduleInfo.title + ' UI explorer'
  }]
  doc.getElementById('title').child = [{
    node: 'text',
    text: pageTitle
  }]
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `"${pageTitle}" documentation for ${moduleInfo.title}`
  }]
  const screenshotData = []
  for (const screenshot of page.screenshots) {
    if (screenshot.indexOf('desktop-en.png') === -1) {
      continue
    }
    const filenameParts = screenshot.split('/').pop().split('-')
    let screenshotDescription = ''
    for (const part of filenameParts) {
      if (part === 'desktop') {
        break
      }
      if (screenshotDescription === '') {
        screenshotDescription = part + '.  '
        continue
      }
      screenshotDescription += ' ' + part.charAt(0).toUpperCase() + part.substring(1)
    }
    screenshotDescription = screenshotDescription.trim()
    screenshotData.push({
      object: 'screenshot',
      urlPath: screenshot,
      description: screenshotDescription.trim()
    })
  }
  if (screenshotData && screenshotData.length) {
    HTML.renderList(doc, screenshotData, 'screenshot-template', 'screenshots')
    HTML.applyImageSRI(doc)
  }
  let htmlPath = `${prependPath}${administrator ? 'administrator' : 'account'}${embeddedPath}`
  htmlPath = path.join(documentationPath, 'ui', htmlPath)
  console.log(htmlPath, folderName)
  createFolderSync(htmlPath, documentationPath)
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  fs.writeFileSync(`${htmlPath}/${folderName}.html`, html)
}

function createFolderSync (path, documentationPath) {
  const nested = path.substring(documentationPath.length)
  const nestedParts = nested.split('/')
  let nestedPath = documentationPath
  for (const part of nestedParts) {
    nestedPath += `/${part}`
    if (!fs.existsSync(nestedPath)) {
      fs.mkdirSync(nestedPath)
    }
  }
}
