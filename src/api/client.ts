import axios from "axios"
import { SERVER_ENPOINT } from "config"

export const generateClient = (accessToken: string, appId: string) => {
    const client = axios.create({
      baseURL: SERVER_ENPOINT,
      headers: {
        authorization: `Bearer ${accessToken}`,
        appId
      }
    })
  
    return client
}