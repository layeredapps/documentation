const beautify = require('js-beautify').html
const fs = require('fs')
const path = require('path')
const HTML = require('./html.js')
const template = fs.readFileSync('./api-route-template.html').toString()

module.exports = (rootPath, moduleInfo, documentationPath, api, urlPath) => {
  const fileDescription = urlPath.split('/').pop()
  const filePath = fileDescription + '.js'
  let verb
  if (fileDescription.indexOf('create-') > -1) {
    verb = 'POST'
  } else if (fileDescription.indexOf('delete-') > -1) {
    verb = 'DELETE'
  } else if (fileDescription.indexOf('update-') > -1 || fileDescription.indexOf('set-') > -1 || fileDescription.indexOf('reset-') > -1) {
    verb = 'PATCH'
  } else {
    verb = 'GET'
  }
  const navbar = fs.readFileSync(moduleInfo.navbarFile).toString().replace('class="api"', 'class="active"')
  const merged = template.replace('<section id="navigation" class="navigation"></section>', `<section id="navigation" class="navigation">${navbar}</section>`)
  const doc = HTML.parse(merged)
  doc.getElementById('title').child = [{
    node: 'text',
    text: `${urlPath} (${verb})`
  }]
  doc.getElementsByTagName('h1')[0].child = [{
    node: 'text',
    text: `${moduleInfo.title} API explorer`
  }]
  doc.getElementsByTagName('title')[0].child = [{
    node: 'text',
    text: `${fileDescription}#${verb} (${moduleInfo.moduleName})`
  }]
  const segments = ['exceptions', 'receives', 'redacts', 'configuration']
  const structure = api[urlPath]
  for (const segment of segments) {
    if (segment === 'receives') {
      const data = []
      if (structure[segment] && structure[segment].length) {
        for (const listItem of structure[segment]) {
          if (segment === 'receives') {
            let required
            if (listItem.indexOf('optionally-required') > -1) {
              required = 'configurable as required'
            } else {
              required = listItem.indexOf('optional') > -1 ? 'optional' : 'required'
            }
            const type = listItem.indexOf('posted') > -1 ? 'POST' : 'URL'
            let variable = type === 'POST' ? listItem.split('posted ').pop() : listItem.split('querystring ').pop()
            let value = variable.indexOf('(') > -1 ? variable.substring(variable.indexOf('(') + 1) : 'string'
            if (value.indexOf(')') > -1) {
              value = value.substring(0, value.indexOf(')'))
            }
            if (value.indexOf('|') > -1) {
              value = value.split('|').join(', ')
            }
            if (variable.indexOf('(') > -1) {
              variable = variable.substring(0, variable.indexOf('('))
            }
            data.push({
              object: 'property',
              variable,
              value,
              required,
              type
            })
          }
        }
        data.sort((a, b) => {
          return a.variable < b.variable ? -1 : 1
        })
        if (segments === 'exceptions' || segment === 'receives') {
          HTML.renderTable(doc, data, 'property-row-template', `${segment}-table`)
        } else {
          HTML.renderList(doc, data, 'property-row-template', `${segment}-list`)
        }
      } else {
        const receivesContainer = doc.getElementById('receives-container')
        receivesContainer.parentNode.removeChild(receivesContainer)
      }
    } else if (segment === 'redacted') {
      const data = []
      for (const item in structure[segment]) {
        for (const i in structure[segment][item]) {
          data.push({
            object: 'property',
            name: structure[segment][item][i]
          })
        }
      }
      data.sort((a, b) => {
        return a.variable < b.variable ? -1 : 1
      })
      HTML.renderList(doc, data, `${segment}-row-template`, segment)
    } else if (segment === 'exceptions') {
      let id = 0
      const items = Object.keys(structure[segment])
      items.sort((a, b) => {
        return a < b ? -1 : 1
      })
      for (const item of items) {
        const exceptions = [{
          id: id++,
          object: 'exception',
          text: item,
          rowSpan: structure[segment][item].length
        }]
        let first = true
        for (const reason of structure[segment][item]) {
          if (first) {
            exceptions[0].note = reason
            first = false
            continue
          }
          exceptions.push({
            id: id++,
            object: 'exception',
            note: reason
          })
        }
        if (exceptions && exceptions.length) {
          HTML.renderTable(doc, exceptions, 'exception-template', 'exceptions-table')
          for (const exception of exceptions) {
            if (exception.text) {
              continue
            }
            const description = doc.getElementById(`description-${exception.id}`)
            description.parentNode.removeChild(description)
          }
        }
      }
    } else {
      const container = doc.getElementById(`${segment}-container`)
      if (container) {
        container.parentNode.removeChild(container)
      }
    }
  }
  if (!Object.keys(structure.exceptions).length) {
    const container = doc.getElementById('exceptions-container')
    if (container) {
      container.parentNode.removeChild(container)
    }
  }
  const isAdministrator = urlPath.indexOf('/administrator') > -1
  let newFilePath = path.join(documentationPath, 'api')
  newFilePath = path.join(documentationPath, 'api/' + (isAdministrator ? 'administrator' : 'user'))
  if (moduleInfo.moduleName === '@layeredapps/maxmind-geoip') {
    newFilePath += '/geoip'
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-connect') {
    newFilePath += '/connect'
  } else if (moduleInfo.moduleName === '@layeredapps/stripe-subscriptions') {
    newFilePath += '/subscriptions'
  } else if (moduleInfo.moduleName === '@layeredapps/organizations') {
    newFilePath += '/organizations'
  }
  let nodejs = 'global' + urlPath.split('/').join('.')
  const parts = nodejs.split('.').pop().split('-')
  nodejs = nodejs.substring(0, nodejs.lastIndexOf('.') + 1)
  for (const i in parts) {
    nodejs += parts[i].charAt(0).toUpperCase() + parts[i].substring(1)
  }
  doc.getElementById('nodejs').classList.add(verb.toLowerCase())
  doc.getElementById('nodejs').child = [{
    node: 'text',
    text: 'await ' + nodejs + '.' + verb.toLowerCase() + '(req)'
  }]
  const jsFilePath = path.join(`${rootPath}/node_modules/${moduleInfo.moduleName}/src/www${urlPath}.js`)
  if (!fs.existsSync(jsFilePath)) {
    return
  }
  doc.getElementById('source-code').child = [{
    node: 'text',
    text: fs.readFileSync(jsFilePath).toString()
  }]
  doc.getElementById('returns').child = [{
    node: 'text',
    text: structure.returns
  }]
  const responseFileName = '/' + filePath.split('/').pop().replace('.js', '.test.json')
  if (fs.existsSync(newFilePath + responseFileName)) {
    const response = doc.getElementById('response-code')
    let responseJSON = fs.readFileSync(newFilePath + responseFileName).toString()
    if (responseJSON.indexOf('{') > -1) {
      responseJSON = JSON.parse(responseJSON)
      for (const field in responseJSON) {
        if (responseJSON[field] + 1 > 1578154662) {
          responseJSON[field] = '{timestamp}'
        }
      }
      response.child = [{
        node: 'text',
        text: JSON.stringify(responseJSON, null, '  ')
      }]
    } else {
      response.parentNode.parentNode.parentNode.removeChild(response.parentNode.parentNode)
    }
  }
  doc.getElementById('test-code').child = [{
    node: 'text',
    text: fs.readFileSync(jsFilePath.replace('.js', '.test.js')).toString()
  }]
  doc.getElementById('github_source').attr.href = `https://github.com/layeredapps/${moduleInfo.moduleName}/tree/main/src/www${urlPath}.js`
  doc.getElementById('github_tests').attr.href = `https://github.com/layeredapps/${moduleInfo.moduleName}/tree/main/src/www${urlPath}.test.js`
  const filename = filePath.split('/').pop().replace('.js', '.html')
  createFolderSync(newFilePath, process.env.DOCUMENTATION_PATH)
  const html = beautify(doc.toString(), { indent_size: 2, space_in_empty_paren: true })
  fs.writeFileSync(`${newFilePath}/${filename}`, `<!doctype html>${html}`)
}

function createFolderSync (path, documentationPath) {
  if (fs.existsSync(path)) {
    return
  }
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
