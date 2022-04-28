const beautify = require('js-beautify').html
const fs = require('fs')
const HTML = require('./html.js')
const path = require('path')
const childProcess = require('child_process')
const createAPIIndex = require('./api-index.js')
const createAPIRoute = require('./api-route.js')
const environmentVariables = require('./environment-variables.js')
const readmeConverter = require('./readme-md-converter.js')
const createUIIndex = require('./ui-index.js')
const createUIRoute = require('./ui-route.js')
const documentationPath = process.env.DOCUMENTATION_PATH || process.argv[2]
const dashboardServerPath = process.env.DASHBOARD_SERVER_PATH || process.argv[3]
global.rootPath = __dirname
global.applicationPath = __dirname

async function start () {
  // purge old files
  childProcess.execSync(`find ${documentationPath}/ -type f -name "*.html" -delete`)
  childProcess.execSync(`rm -rf ${documentationPath}/public`)
  // copy the /public
  childProcess.execSync(`cp -R public ${documentationPath}/public`)
  // copy the index.html
  const indexHTML = fs.readFileSync(path.join(__dirname, '/index.html'))
  const indexDoc = HTML.parse(indexHTML)
  HTML.applyImageSRI(indexDoc)
  const finalHTML = beautify(indexDoc.toString(), { indent_size: 2, space_in_empty_paren: true })
  fs.writeFileSync(path.join(documentationPath, '/index.html'), finalHTML)
  // module documentation
  const modules = await scanModuleConfiguration(dashboardServerPath)
  for (const moduleName of modules) {
    await generate(dashboardServerPath, moduleName)
  }
  // dashboard documentation
  await generate(dashboardServerPath, '@layeredapps/dashboard')
  // example documentation
  let i = 1
  while (true) {
    const examplePath = process.env[`EXAMPLE_DASHBOARD_SERVER_PATH${i}`]
    if (!examplePath) {
      break
    }
    const packageJSON = require(`${examplePath}/package.json`)
    await generate(examplePath, packageJSON.name)
    i++
  }
}

start()

async function generate (rootPath, moduleName) {
  let title, navbarFile, apiIndex, urlStem, accountHome, administratorHome
  if (moduleName === '@layeredapps/dashboard') {
    title = 'Dashboard'
    navbarFile = './navbar-dashboard.html'
    apiIndex = '/dashboard-api'
    urlStem = ''
    accountHome = '/account'
    administratorHome = '/administrator'
  } else if (moduleName === '@layeredapps/organizations') {
    title = 'Organizations module'
    navbarFile = './navbar-organizations.html'
    apiIndex = '/organizations-api'
    urlStem = '/organizations'
    accountHome = '/account/organizations'
    administratorHome = '/administrator/organizations'
  } else if (moduleName === '@layeredapps/maxmind-geoip') {
    title = 'MaxMind GeoIP module'
    navbarFile = './navbar-maxmind-geoip.html'
    apiIndex = '/maxmind-geoip-api'
    urlStem = ''
  } else if (moduleName === '@layeredapps/stripe-connect') {
    title = 'Stripe Connect module'
    navbarFile = './navbar-stripe-connect.html'
    apiIndex = '/stripe-connect-api'
    urlStem = '/connect'
    accountHome = '/account/connect'
    administratorHome = '/administrator/connect'
  } else if (moduleName === '@layeredapps/stripe-subscriptions') {
    title = 'Stripe Subscriptions module'
    navbarFile = './navbar-stripe-subscriptions.html'
    apiIndex = '/stripe-subscriptions-api'
    urlStem = '/subscriptions'
    accountHome = '/account/subscriptions'
    administratorHome = '/administrator/subscriptions'
  } else if (moduleName === '@layeredapps/oauth') {
    title = 'OAuth module'
    navbarFile = './navbar-oauth.html'
  } else if (moduleName === '@layeredapps/oauth-github') {
    title = 'OAuth GitHub module'
    navbarFile = './navbar-oauth-github.html'
    index = '/oauth-github-module'
  } else if (moduleName === 'example-web-app') {
    title = 'Example Web App'
    navbarFile = './navbar-example-web-app.html'
  } else if (moduleName === 'example-subscription-web-app') {
    title = 'Example Subscription Web App'
    navbarFile = './navbar-example-subscription-web-app.html'
  }
  const moduleInfo = {
    moduleName,
    title,
    apiIndex,
    urlStem,
    navbarFile: path.join(__dirname, navbarFile)
  }
  // create the main documentation page
  await readmeConverter(rootPath, moduleInfo, documentationPath)
  // the ui structure
  const ui = await scanUIStructure(rootPath, moduleName, urlStem)
  if (ui) {
    for (const url in ui.urls) {
      if (url === '/' || url.startsWith('/api/') || url.startsWith('/webhooks/')) {
        continue
      }
      ui.urls[url].url = url
      let urlPath
      if (moduleName.startsWith('@')) {
        urlPath = path.join(documentationPath, 'screenshots', url)
      } else {
        urlPath = path.join(documentationPath, 'screenshots/' + moduleName, url)
      }
      let addIndex = false
      if (!fs.existsSync(urlPath)) {
        urlPath = path.join(urlPath, 'index')
        addIndex = true
      }
      if (fs.existsSync(urlPath)) {
        const files = fs.readdirSync(urlPath)
        const screenshots = []
        let prefix
        if (moduleInfo.moduleName.startsWith('@')) {
          prefix = ''
        } else {
          prefix = `/${moduleInfo.moduleName}`
        }
        let imageURL = url
        if (addIndex) {
          imageURL += '/index'
        }
        for (const file of files) {
          if (file.endsWith('.png')) {
            screenshots.push(`/screenshots${prefix}${imageURL}/${file}`)
          }
        }
        ui.urls[url].screenshots = screenshots
      }
    }
    const example = await scanExamples(documentationPath, moduleName)
    await createUIIndex(rootPath, moduleInfo, documentationPath, ui, example)
    for (const url in ui.urls) {
      if (url === '/' || url.startsWith('/api/') || url.startsWith('/webhooks/')) {
        continue
      }
      if (urlStem && url.indexOf(urlStem) === -1) {
        continue
      }
      await createUIRoute(rootPath, moduleInfo, documentationPath, ui.urls[url])
    }
    if (example && example.length) {
      for (const route of example) {
        await createUIRoute(rootPath, moduleInfo, documentationPath, route)
      }
    }
  }
  // the api documentation
  const api = await scanAPIStructure(rootPath, moduleName)
  if (api) {
    await createAPIIndex(rootPath, moduleInfo, documentationPath, api)
    for (const urlPath in api) {
      await createAPIRoute(rootPath, moduleInfo, documentationPath, api, urlPath)
    }
  }
  // the environment configuration
  const env = await scanConfiguration(rootPath, moduleName)
  if (env) {
    await environmentVariables(rootPath, moduleInfo, documentationPath, env)
  }
}

async function scanExamples (documentationPath, moduleName) {
  if (moduleName.startsWith('@')) {
    return
  }
  const example = []
  const folderPath = path.join(documentationPath, 'screenshots', moduleName)
  const contents = fs.readdirSync(folderPath)
  for (const folder of contents) {
    if (folder === 'account' || folder === 'administrator') {
      continue
    }
    const files = fs.readdirSync(path.join(folderPath, folder))
    const screenshots = []
    const prefix = `/${moduleName}`
    for (const file of files) {
      if (file.endsWith('.png')) {
        screenshots.push(`/screenshots${prefix}/${folder}/${file}`)
      }
    }
    if (!screenshots.length) {
      continue
    }
    example.push({
      object: 'route',
      url: `${prefix}/${folder}`,
      title: folder.charAt(0).toUpperCase() + folder.split('-').join(' ').substring(1),
      screenshots,
      src: screenshots[screenshots.length - 1],
      example: true
    })
  }
  return example
}

async function scanUIStructure (rootPath, moduleName, urlStem) {
  let filePath
  if (moduleName.startsWith('@')) {
    filePath = path.join(rootPath, `node_modules/${moduleName}/sitemap.json`)
  } else {
    filePath = `${rootPath}/sitemap.json`
  }
  if (!fs.existsSync(filePath)) {
    return
  }
  const raw = require(filePath)
  const sitemap = {
    urls: {}
  }
  for (const key in raw.urls) {
    if (!raw.urls[key].htmlFilePath) {
      continue
    }
    if (!moduleName.startsWith('@') || (urlStem && raw.urls[key].htmlFilePath.indexOf(urlStem) > -1)) {
      sitemap.urls[key] = raw.urls[key]
    }
  }
  return sitemap
}

async function scanAPIStructure (rootPath, moduleName) {
  const filePath = path.join(rootPath, `node_modules/${moduleName}/api.json`)
  if (!fs.existsSync(filePath)) {
    return
  }
  return require(filePath)
}

async function scanConfiguration (rootPath, moduleName) {
  const filePath = path.join(rootPath, `node_modules/${moduleName}/env.json`)
  if (!fs.existsSync(filePath)) {
    return
  }
  return require(filePath)
}

async function scanModuleConfiguration () {
  const packageJSON = require(`${dashboardServerPath}/package.json`)
  if (!packageJSON.dashboard || !packageJSON.dashboard.modules || !packageJSON.dashboard.modules.length) {
    return
  }
  return packageJSON.dashboard.modules
}
