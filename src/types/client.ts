export interface Coin98ClientInterface {
  id?: string
  isConnected: boolean
}

export type EventType = {
  id: string | symbol
  type: string
  data: any
}

export type optionType = {
  id?: string
  linkModule?: any
  appId?: string
}

export type LiteClientConfig = {
  callback: (link: string) => any
}

const evmRequest = [
  'eth_getEncryptionPublicKey',
  'eth_sign',
  'personal_sign',
  'personal_ecRecover',
  'sign_transaction',
  'eth_sendTransaction',
  'send_transaction',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'eth_accounts',
  'eth_requestAccounts'
] as const

const solRequestType = [
  'sol_accounts',
  'sol_requestAccounts',
  'sol_sign',
  'sol_signAllTransactions',
  'sol_signMessage',
  'sol_verify',
  'transfer'
] as const

const nearRequestType = [
  'near_account',
  'near_accountBalance',
  'near_accountState',
  'near_view',
  'near_signAndSendTransaction'
] as const

const terraRequestType = ['connect', 'sign', 'post'] as const

const cosmosRequestType = [
  'cosmos_getKey',
  'cosmos_sign',
  'cosmos_signAmino',
  'cosmos_signDirect',
  'cosmos_sendTx',
  // Experimental Functions
  'cosmos_experimentalSuggestChain'
] as const

export type requestParameter = {
  id?: string | number,
  jsonrpc?: string,
  method:
    | typeof evmRequest[number]
    | typeof solRequestType[number]
    | typeof nearRequestType[number]
    | typeof terraRequestType[number]
    | typeof cosmosRequestType[number]
  params?: any
  redirect?: string
}

export type connectOptions = {
  id?: string | number
  logo?: string
  name: string
  url: string
}

export type connectNativeOptions = {
  id?: string
  logo: string
  name: string
  callbackURL: string
}

export type Connection = {
  id: string | number
  chain: string
}
