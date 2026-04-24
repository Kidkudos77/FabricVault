import type { Identity } from "~contexts/identity"
import type { Peer } from "~contexts/peer"
import type { RequestData } from "~contexts/request"

import { handleSignRequest } from "./wallet"
import { CryptoManager } from "~lib/crypto"

const cryptoManager = new CryptoManager()

export async function handleSendRequest(
  peer: Peer,
  identity: Identity,
  request: RequestData
) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(peer.rpcUrl)
    const requestId = Math.random().toString(36).substring(2)

    ws.onopen = async () => {
      // Attach Dilithium3 signature to credential payload if present
      const params = request.payload.params || {}
      let pqSignature: { signature: string; publicKey: string; algorithm: string } | null = null
      if (params.credentialJson) {
        try {
          pqSignature = await cryptoManager.signWithDilithium3(
            typeof params.credentialJson === "string"
              ? params.credentialJson
              : JSON.stringify(params.credentialJson)
          )
        } catch (e) {
          console.warn("Dilithium3 signing failed, proceeding without PQ signature:", e)
        }
      }

      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: request.payload.method,
          params: {
            identity: {
              mspId: identity.mspId,
              certificate: identity.certificate
            },
            peer: {
              name: peer.name,
              endpoint: peer.endpoint,
              tlsRootCert: peer.tlsRootCert
            },
            ...params,
            // Attach PQ signature if credential signing was requested
            ...(pqSignature ? { pqSignature } : {})
          },
          id: requestId
        })
      )
    }

    ws.onerror = (err) => {
      console.error("WebSocket error", err)
      reject(new Error("WebSocket connection error"))
      ws.close()
    }

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data)
      if (message.method === "signDigest" && message.params?.digest) {
        const signResponse = await handleSignRequest(
          {
            digest: message.params.digest,
            certificate: message.params.certificate
          },
          request.origin
        )

        if (signResponse.success) {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              result: { signature: signResponse.signature },
              id: message.id
            })
          )
        } else {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32001,
                message: signResponse.error || "Signing failed"
              },
              id: message.id
            })
          )
        }
      } else if (message.result) {
        resolve(message.result)
        ws.close()
      } else if (message.error) {
        reject(new Error(message.error.message))
        ws.close()
      } else {
        reject(
          new Error(
            "handleSendRequest: Unhandled or mismatched WebSocket message:",
            message
          )
        )
      }
    }
  })
}
