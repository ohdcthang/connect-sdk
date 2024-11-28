import { EventEmitter } from 'events'
import {
  // eslint-disable-next-line no-unused-vars
  requestParameter,
  // eslint-disable-next-line no-unused-vars
  connectOptions
} from '../types/client'
import { compact, uniqueId } from '../utils/functions'
import bs58 from '../utils/base58'
import BigIntPolyfill from 'bignumber.js'
import { CosmJSOfflineSigner, CosmJSOfflineSignerOnlyAmino } from './cosmos'
import { DeviceUUID } from 'device-uuid'
import { Consumer } from 'sqs-consumer'
import axios, { AxiosInstance } from 'axios'
import { QUEUE_URL, SERVER_ENPOINT, SQS_CLIENT } from 'config'
import { generateClient } from 'api'
declare let window: any

class Coin98Client extends EventEmitter {
  static instance: Coin98Client
  private axiosClient: AxiosInstance

  protected isConnected: boolean = false
  protected isNative?: boolean = false

  private id?: string | number[]
  private accessToken?: string
  private shouldReconnect: boolean = false
  private name: string | any

  public client: any
  public linkModule?: any
  public chain: string
  public callbackURL: string

  constructor() {
    super()
    if (Coin98Client.instance) {
      return Coin98Client.instance
    }
    // Polyfill
    if (typeof window !== 'undefined' && !window.BigInt) {
      window.BigInt = BigIntPolyfill
    }

    this.initSdk()

    this.onResponse()

    Coin98Client.instance = this
  }

  async initSdk() {
    const [existId, existToken] = [
      window.localStorage.getItem('uuid'),
      window.localStorage.getItem('accessToken')
    ]

    if (!existId) {
      this.id = new DeviceUUID().get()
    } else {
      this.id = existId
    }

    if (!existToken) {
      const { data } = await axios?.post(`${SERVER_ENPOINT}authenticate`, {
        appId: this.id
      })

      this.accessToken = data.accessToken
      window.localStorage.setItem('accessToken', data.accessToken)
    } else {
      this.accessToken = existToken
    }

    this.axiosClient = generateClient(this.accessToken as string, this.id as string)
  }

  async onResponse() {
    if (this.id) {
      const app = Consumer.create({
        queueUrl: QUEUE_URL,
        messageAttributeNames: ['All'],
        sqs: SQS_CLIENT,
        visibilityTimeout: 0, 
        // waitTimeSeconds: 0,
        handleMessage: async (message) => {
          const { MessageAttributes } = message
          if(MessageAttributes?.appId?.StringValue === this.id){
            this.emit( MessageAttributes?.id?.StringValue as string, {
              result: message.Body
            })
          }
        }
      })

      app.on('processing_error', (_err) => {
      })

      app.start()
    }
  }

  public connect = (chain: string, options: connectOptions) => {
    if (!chain) {
      throw new Error('Unsupported Chain ID')
    }

    if (!this.client && !this.id) {
      throw new Error('Coin98 Connect has not been initialized')
    }

    if (!options.name) {
      throw new Error('Dapps Name required')
    }

    this.chain = chain
    this.name = options.name

    return new Promise(async (resolve, reject) => {
      const { data } = await this.axiosClient?.post('/send-message', {
        appId: this.id,
        message: 'connection_request',
        attributes: {
          url: new URL(window.location.href).origin,
          id: this.id
        }
      })

      if (!this.isConnected) {
        const result: any = await this.request({
          method: 'connect',
          params: [{ ...options, messageId: data?.MessageId }]
        })

        const errors = result?.error || result?.errors || !result.result

        if (errors) {
          return reject(new Error(errors.message || 'Connect Rejected'))
        }

        this.isConnected = true

        this.shouldReconnect = true

        resolve(result)
      }
    })
  }

  public disconnect = () => {
    this.isConnected = false
    this.clearSession()
    this.client.close()
  }

  public request = async (args: requestParameter) => {
    if (!this.isConnected && this.shouldReconnect && this.id) {
      // Reconnect and push new request
      await this.connect(this.chain, {
        // @ts-expect-error
        id: this.id,
        name: this.name
      })
    }

    if (!this.isConnected && args.method !== 'connect') {
      throw new Error('You need to connect before handle any request!')
    }

    const id: string = uniqueId()

    const requestParams =  {
      ...args,
      id,
      appId: this.id,
      chain: this.chain,
      accessToken: this.accessToken
    }

    if (args.method !== 'connect') {
      delete requestParams.accessToken
    } 

    const isSolana: boolean = requestParams.method.startsWith('sol')
    const isCosmos: boolean = requestParams.method.startsWith('cosmos')

    if (isSolana) {
      requestParams.params = this.transformSolanaParams(
        requestParams.params,
        requestParams.method
      )
    }

    if (isCosmos) {
      requestParams.params = this.transformCosmosParams(
        requestParams.params,
        requestParams.method
      )
    }

    requestParams.redirect = encodeURI(
      this.callbackURL || window?.location?.href
    )

    const encodedURL = this.santinizeParams(
      requestParams
    )

    const _this = this
    const promisify = new Promise((resolve) => {
      _this.once(id as string, (e) => {
        resolve(e)
      })
      this.openURL(encodedURL, args.method)
    })

    const result = await promisify

    return result
  }

  // Cosmos Methods
  public getOfflineSigner (chainId: string) {
    return new CosmJSOfflineSigner(chainId, this)
  }

  public getOfflineSignerAuto (chainId: string) {
    return new CosmJSOfflineSigner(chainId, this)
  }

  public getOfflineSignerOnlyAmino (chainId: string) {
    return new CosmJSOfflineSignerOnlyAmino(chainId, this)
  }

  private transformSolanaParams = (params: any, method: string) => {
    if (method === 'sol_sign') {
      // Transform single transaction
      params[1] =
        typeof params[0] === 'string' || Array.isArray(params[0])
          ? 'message'
          : 'transaction'
      if (params[0].serializeMessage) {
        params[0] = bs58.encode(params[0].serializeMessage())
      }
    }

    if (method === 'sol_signAllTransactions' && Array.isArray(params[0])) {
      const arrTxs = params[0]

      params[0] = arrTxs.slice().map((txs) => {
        if (typeof txs === 'object' && txs.serializeMessage) {
          return bs58.encode(txs.serializeMessage())
        }
        return txs
      })
      params[0] = JSON.stringify(compact(params[0]))
    }

    if (method === 'sol_signMessage') {
      const bufferMsg =
        typeof params[0] === 'string'
          ? Buffer.from(params[0], 'utf-8')
          : params[0]
      params[0] = bs58.encode(bufferMsg)
    }

    return params
  }

  private transformCosmosParams = (params: any, method: string) => {
    if (method === 'cosmos_signDirect') {
      params[0].signDoc.bodyBytes = bs58.encode(params[0].signDoc.bodyBytes)
      params[0].signDoc.authInfoBytes = bs58.encode(
        params[0].signDoc.authInfoBytes
      )
    }

    return params
  }

  private santinizeParams = (params: object) => {
    return encodeURIComponent(JSON.stringify(params))
  }

  private clearSession() {
    if (
      typeof window !== 'undefined' &&
      typeof sessionStorage !== 'undefined'
    ) {
      window.sessionStorage.removeItem('accessToken')
    }
  }

  private openURL(url: string, method: string) {
    // Santinize url
    const urlEncode = encodeURIComponent(url)
    url = `coin98://app/${method}/${urlEncode}`
    if (window.location.hash) {
      // Simulate Href Click
      const aTag = document.createElement('a')
      aTag.setAttribute('id', 'coin98Clickable')
      aTag.setAttribute('href', url)
      document.body.appendChild(aTag)
      requestAnimationFrame(() => {
        aTag.click()
        // Safely Remove After Done
        setTimeout(() => {
          const clickable = document.querySelector('#coin98Clickable')
          // eslint-disable-next-line no-unused-expressions
          clickable?.remove()
        }, 200)
      })
    } else {
      window.location.href = url
    }
  }
}

export default Coin98Client
