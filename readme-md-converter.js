const beautify = require('js-beautify').html
const fs = require('fs')
const Remarkable = require('remarkable')
const HTML = require('./html.js')
const path = require('path')
const template = fs.readFileSync('./readme-md-template.html').toString()

module.exports = (rootPath, moduleInfo, documentationPath) => {
  const md = new Remarkable.Remarkable()
  let filePath
  if (moduleInfo.moduleName.startsWith('@layeredapps')) {
    filePath = path.join(rootPath, `/node_modules/${moduleInfo.moduleName}/readme.md`)
  } else {
    filePath = path.join(rootPath, '../readme.md')
  }
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="readme"', 'class="active"')
  const text = fs.readFileSync(filePath).toString()
  const merged = template.replace('<title></title>', '<title>' + moduleInfo.title + '</title>')
    .replace('<div class="content"></div>', `<div class="content">${md.render(text)}</div>`)
    .replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged.replace('<!DOCTYPE html>', ''))
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: moduleInfo.title
  }]
  const codeTags = doc.getElementsByTagName('code')
  if (codeTags && codeTags.length) {
    for (const tag of codeTags) {
      tag.setAttribute('data-language', 'js')
    }
  }
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  const filename = formatFileName(filePath)
  fs.writeFileSync(`${documentationPath}/${filename}`, `<!doctype html>${html}`)
}

function formatFileName (filePath) {
  if (filePath.indexOf('/stripe-connect/') > -1) {
    return 'stripe-connect-module.html'
  } else if (filePath.indexOf('/stripe-subscriptions/') > -1) {
    return 'stripe-subscriptions-module.html'
  } else if (filePath.indexOf('/maxmind-geoip/') > -1) {
    return 'maxmind-geoip-module.html'
  } else if (filePath.indexOf('/organizations/') > -1) {
    return 'organizations-module.html'
  } else if (filePath.indexOf('/oauth/') > -1) {
    return 'oauth-module.html'
  } else if (filePath.indexOf('/oauth-github/') > -1) {
    return 'oauth-github-module.html'
  } else if (filePath.indexOf('/example-web-app') > -1) {
    return 'example-web-app.html'
  } else if (filePath.indexOf('example-subscription-web-app') > -1) {
    return 'example-subscription-web-app.html'
  } else if (filePath.indexOf('/dashboard/') > -1) {
    return 'dashboard.html'
  }
  return filePath
}
