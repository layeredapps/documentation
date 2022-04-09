const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const template = fs.readFileSync('./environment-variables-template.html').toString()

module.exports = (rootPath, moduleInfo, documentationPath, keys) => {
  const properties = []
  for (const key in keys) {
    keys[key].raw = key
    keys[key].name = key
    properties.push(keys[key])
  }
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="env"', 'class="active"')
  const sorted = [].concat(properties)
  sorted.sort((a, b) => {
    return a.raw > b.raw ? 1 : -1
  })
  const data = []
  for (const property of sorted) {
    const description = property.description
    const unset = property.default || ''
    let value = property.value || ''
    if (value.indexOf(',') > -1) {
      value = value.split(',').join(', ')
    }
    data.push({
      object: 'variable',
      name: property.raw,
      description,
      default: unset,
      value
    })
  }
  if (!data.length) {
    return
  }
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} configuration`
  }]
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} configuration`
  }]
  HTML.renderList(doc, data, 'variable-row-template', 'variables-table')
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  const configurationFile = moduleInfo.moduleName.split('/').pop() + '-configuration.html'
  fs.writeFileSync(`${documentationPath}/${configurationFile}`, `<!doctype html>${html}`)
}
