const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const path = require('path')
const template = fs.readFileSync('./ui-route-template.html').toString()

module.exports = async (rootPath, moduleInfo, documentationPath, page) => {
  if( !page.screenshots || !page.screenshots.length) {
    return
  }
  let embeddedPath, prependPath, folderName
  if (moduleInfo.moduleName === '@layeredapps/dashboard') {
    prependPath = ''
    embeddedPath = ''
    folderName = page.url === '/account' || page.url === '/administrator' ? 'index' : page.url.split('/').pop()
  } else if (moduleInfo.moduleName === '@layeredapps/organizations') {
    prependPath = ''
    embeddedPath = '/organizations'
    folderName = page.url === '/account/organizations' || page.url === '/administrator/organizations' ? 'index' : page.url.split('/').pop()
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-connect') {
    prependPath = ''
    embeddedPath = '/connect'
    folderName = page.url === '/account/connect' || page.url === '/administrator/connect' ? 'index' : page.url.split('/').pop()
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-subscriptions') {
    prependPath = ''
    embeddedPath = '/subscriptions'
    folderName = page.url === '/account/subscriptions' || page.url === '/administrator/subscriptions' ? 'index' : page.url.split('/').pop()
  } else {
    if (moduleInfo.moduleName === 'example-web-app') {
      prependPath = 'example-web-app/'
    } else if (moduleInfo.moduleName === 'example-subscription-web-app') {
      prependPath = 'example-subscription-web-app/'
    }
    if (page.screenshots && page.screenshots[0].indexOf('/organizations') > -1) {
      embeddedPath = '/organizations'
    } else if (page.screenshots && page.screenshots[0].indexOf('/subscriptions') > -1) {
      embeddedPath = '/subscriptions'
    } else if (page.screenshots && page.screenshots[0].indexOf('/connect') > -1) {
      embeddedPath = '/connect'
    } else {
      embeddedPath = ''
    }
    folderName = page.url === '/' ? 'index' : page.url.split('/').pop()
    if (page.url === '/example-web-app/account' || 
        page.url === '/example-web-app/administrator' || 
        page.url === '/example-web-app/account/organizations' || 
        page.url === '/example-web-app/administrator/organizations' ||
        page.url === '/example-subscription-web-app/account' || 
        page.url === '/example-subscription-web-app/administrator' || 
        page.url === '/example-subscription-web-app/account/organizations' || 
        page.url === '/example-subscription-web-app/administrator/organizations' ||
        page.url === '/example-subscription-web-app/account/subscriptions' ||
        page.url === '/example-subscription-web-app/administrator/subscriptions') {
      folderName = 'index'
    }
  }
  const administrator = page.url.indexOf('/administrator') > -1
  const account = page.url.indexOf('/account') > -1
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="ui"', 'class="active"')
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementById('title').child = [{
    node: 'text',
    text: page.title
  }]
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `"${page.title}" navigation flow in ${moduleInfo.title}`
  }]
  const screenshotData = []
  for (const screenshot of page.screenshots) {
    if (screenshot.indexOf('desktop-en-light.png') === -1) {
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
  let htmlPath
  if (administrator) {
    htmlPath = `${prependPath}administrator${embeddedPath}`
  } else if (account) {
    htmlPath = `${prependPath}account${embeddedPath}`
  } else {
    htmlPath = prependPath
  }
  htmlPath = path.join(documentationPath, 'ui', htmlPath)
  createFolderSync(htmlPath, documentationPath)
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  fs.writeFileSync(`${htmlPath}/${folderName}.html`, `<!doctype html>${html}`)
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
