import { useState } from 'react'
import elliptic from 'elliptic'
import KeyEncoder from 'key-encoder'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import buffer from 'buffer'
// import jsSha from 'js-sha256'

const STORAGE_KEYS = {
  privateKey: 'privateKey',
  publicKey: 'publicKey',
  username: 'personalDomain',
  content: 'content',
  downloadedContent: 'downloadedContent',
  path: 'path'
}

const Api = () => {
  const API_URL = 'http://localhost:3000'
  const makeRequest = async (
    method = 'GET',
    endpoint = '/',
    params = {}
  ): Promise<any> => {
    let data = {}
    try {
      const reponse = await fetch(API_URL + endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })
      data = await reponse.json()
    } catch (e) {
      console.error(e)
    }
    return data
  }
  return {
    validateKey: async (domain: string, publicKey: string) => {
      return await makeRequest('POST', `/users/${domain}/validate`, {
        publicKey
      })
    },
    validatePath: async (domain: string, path: string) => {
      return await makeRequest('POST', `/users/${domain}/path/validate`, {
        path
      })
    }
  }
}

function escapeHTML(str: string) {
  let div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  const content = div.innerHTML
  // document.body.removeChild(div)
  return content.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function createSlug(str: string) {
  return str
    .split('\n')[0]
    .substring(0, 64)
    .toLowerCase() // convert to lowercase
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // remove invalid chars
    .replace(/--+/g, '-') // remove duplicate hyphens
}

function App() {
  const [username, setUsername] = useState(
    localStorage.getItem(STORAGE_KEYS.username) || ''
  )
  const [content, setContent] = useState(
    localStorage.getItem(STORAGE_KEYS.content) || ''
  )
  const [path, setPath] = useState(
    localStorage.getItem(STORAGE_KEYS.path) || ''
  )
  const [downloadedContent, setDownloadedContent] = useState(
    localStorage.getItem(STORAGE_KEYS.downloadedContent) || ''
  )

  const generateKeys = () => {
    const EC = elliptic.ec
    var ec = new EC('secp256k1')
    var keys = ec.genKeyPair()
    const rawPrivateKey = keys.getPrivate('hex')
    const rawPublicKey = keys.getPublic('hex')
    window.localStorage.setItem(STORAGE_KEYS.publicKey, rawPublicKey)
    window.localStorage.setItem(STORAGE_KEYS.privateKey, rawPrivateKey)
  }

  const downloadPrivateKey = () => {
    window.Buffer = buffer.Buffer
    const rawPrivateKey = localStorage.getItem(STORAGE_KEYS.privateKey)
    if (rawPrivateKey) {
      const keyEncoder = new KeyEncoder('secp256k1')
      const pemPrivateKey = keyEncoder.encodePrivate(
        rawPrivateKey!,
        'raw',
        'pem',
        'pkcs8'
      )
      const blob = new Blob([pemPrivateKey])
      const a = window.document.createElement('a')
      a.href = window.URL.createObjectURL(blob)
      a.download = `did-private.pem`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const getPublicKeyPem = () => {
    window.Buffer = buffer.Buffer
    const rawPublicKey = localStorage.getItem(STORAGE_KEYS.publicKey)
    if (rawPublicKey) {
      const keyEncoder = new KeyEncoder('secp256k1')
      const pemPublicKey = keyEncoder.encodePublic(rawPublicKey, 'raw', 'pem')
      return pemPublicKey
    } else {
      throw 'Public key missing'
    }
  }

  const downloadPublicKey = () => {
    const pemPublicKey = getPublicKeyPem()
    const blob = new Blob([pemPublicKey])
    const a = window.document.createElement('a')
    a.href = window.URL.createObjectURL(blob)
    a.download = `did.pem`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // const generateSignature = () => {
  //   const hash = jsSha.sha256('Hello world!')
  //   console.log(hash)
  //   const EC = elliptic.ec
  //   const ec = new EC('secp256k1')
  //   const key = ec.keyFromPrivate(localStorage.getItem('privateKey')!, 'hex')
  //   const signature = key.sign(hash)
  //   console.log(signature)
  //   console.log(signature.toDER())
  // }

  const renderDowloadKeys = () => {
    if (!localStorage.getItem(STORAGE_KEYS.privateKey)) {
      return null
    }
    return (
      <div>
        <h3>✅ Step 1: Generate private and public keys:</h3>
        <button onClick={downloadPrivateKey}>Download private key</button>
        <button onClick={downloadPublicKey}>Download public key</button>
      </div>
    )
  }

  const renderGenerateKeys = () => {
    if (localStorage.getItem(STORAGE_KEYS.privateKey)) {
      return null
    }
    return (
      <div>
        <h2>Step 1: Generate private and public keys:</h2>
        <button onClick={generateKeys}>Generate keys</button>
      </div>
    )
  }

  const validatePath = async () => {
    if (!path || !username) {
      return
    }
    const response = await Api().validatePath(username, path)
    if (response?.valid) {
      //TODO: display error message
      localStorage.setItem(STORAGE_KEYS.path, path)
    }
    // TODO: set state loading: false to update state
    console.log(response)
  }

  const validateDomain = async () => {
    // TODO: display loading state
    const response = await Api().validateKey(username, getPublicKeyPem())
    if (response?.valid) {
      //TODO: display error message
      localStorage.setItem(STORAGE_KEYS.username, username)
    }
    // TODO: set state loading: false to update state
    console.log(response)
  }

  const renderValidateDomain = () => {
    if (!localStorage.getItem(STORAGE_KEYS.privateKey)) {
      return null
    }
    const storedUsername = localStorage.getItem(STORAGE_KEYS.username)
    return (
      <div>
        <h3>
          {storedUsername ? '✅ ' : null}
          Step 2: Prove domain ownership by uploading public key to a domain
          that you own
        </h3>
        http://
        <input
          disabled={!!storedUsername}
          placeholder="example.com"
          onChange={(e) => setUsername(e.target.value.trim())}
          value={username || storedUsername || ''}
        />
        /did.pem
        {storedUsername ? null : (
          <button onClick={validateDomain}>Validate</button>
        )}
      </div>
    )
  }

  const downloadSocialPost = () => {
    const trimmedContent = content.trim()
    const escapedContent = escapeHTML(trimmedContent)
      .split('\n')
      .filter((p) => p)
    const rows = escapedContent.map((c) => {
      return `    <meta name="did:content" content="${c}">`
    })
    // TODO attach image
    // <meta name="did:media" content="${url}">`
    // <meta name="did:media:hash" content="${imageHash}">`
    // <meta name="did:link" content="${url}">`
    // <meta name="did:link:hash" content="${pageHash}">` (could be DID page or regular link)
    const data = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
${rows.join('\n')}
    <link rel="stylesheet" href="style.css">
    <title>${escapedContent[0].substring(0, 256)}</title>
  </head>
  <body>
    <div id="content">
      ${escapedContent.join('<br>\n      ')}
    </div>
  </body>
</html>

`
    const blob = new Blob([data])
    const a = window.document.createElement('a')
    a.href = window.URL.createObjectURL(blob)
    a.download = `index.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    localStorage.setItem(STORAGE_KEYS.downloadedContent, trimmedContent)
    setDownloadedContent(trimmedContent)
  }

  const renderValidatePost = () => {
    const storedPath = localStorage.getItem(STORAGE_KEYS.path)
    if (!downloadedContent) {
      return null
    }
    const suggestedSlug = createSlug(downloadedContent)
    return (
      <div>
        <h2>
          {storedPath ? '✅ ' : null} Step 4: Upload your social post to your
          validated domain
        </h2>
        <p>
          Create a folder on your folder and upload downloaded index.html to it.
          A good name for such folder could be <i>{suggestedSlug}</i>
        </p>
        http://{username}/
        <input
          id="url"
          disabled={storedPath ? true : false}
          placeholder={suggestedSlug}
          defaultValue={storedPath || ''}
          onChange={(e) => setPath(e.target.value.trim())}
        />
        {storedPath ? null : <button onClick={validatePath}>Check URL</button>}
      </div>
    )
  }

  const renderSumbitPost = () => {
    if (!localStorage.getItem(STORAGE_KEYS.path)) {
      return null
    }
    return (
      <div>
        <h3>Step 5: Submit your signed post to DID node</h3>
        Node: tautvilas.lt
        <br />
        <button>Submit</button>
      </div>
    )
  }

  const renderDownloadPost = () => {
    if (!localStorage.getItem(STORAGE_KEYS.username)) {
      return null
    }
    return (
      <div>
        <h3>
          {downloadedContent ? '✅ ' : null}Step 3: Write your post and download
          generated html file
        </h3>
        <label htmlFor="post">Your post:</label>
        <br />
        <textarea
          id="post"
          defaultValue={content}
          onChange={(e) => {
            setContent(e.target.value.trim())
            localStorage.setItem(STORAGE_KEYS.content, e.target.value.trim())
          }}
        ></textarea>
        <br />
        {content.length > 10 ? (
          <button onClick={downloadSocialPost}>
            Download social post file
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <h1>
        Submit your first social post to DID (Decentralized Information
        Distributor)
      </h1>
      {renderGenerateKeys()}
      {renderDowloadKeys()}
      {renderValidateDomain()}
      {renderDownloadPost()}
      {renderValidatePost()}
      {renderSumbitPost()}
      {/*
      <div class="step hidden" id="step6">
        <h2>Step 6: See your post appear on a social reader platform</h2>
        <a href="#">Open link</a>
      </div>
      <button
        onClick={() => {
          window.localStorage.clear()
          setStep(0)
        }}
      >
        Reset {step}
      </button> */}
    </>
  )
}

export default App
