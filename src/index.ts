
import * as bsv from 'bsv';

import * as Message from 'bsv/message'

import * as http from 'superagent'

import * as uuid from 'uuid'

import * as Run from 'run-sdk'

const run = new Run()

import * as filepay from 'filepay'

type Integer = number;

const apiBase = 'https://get402.com/api'

interface Output {
  script: string;
  satoshis: Integer
}

export class PaymentRequired {
  network: string;
  outputs: Output[];
  memo: string;
  paymentURL: string;

  constructor(paymentRequest) {
    this.outputs = paymentRequest.outputs
    this.memo = paymentRequest.memo
    this.paymentURL = paymentRequest.paymentURL
    this.network = paymentRequest.paymentURL
  }
}

export class NotAuthorized implements Error{
  name = "NotAuthorized" 
  message = "Request Not Authorized" 
}

interface ChargeCredit {
  credits: Integer;
}

export class Client {

  app: App;
  identifier: string;
  privatekey: bsv.PrivateKey;

  constructor(app: App, identifier: string, privatekey?: bsv.PrivateKey) {

    this.app = app;
    this.privatekey = privatekey;
    this.identifier = identifier;

  }

  static fromPrivateKey(app: App, privatekey: bsv.PrivateKey) {

    let identifier = privatekey.toAddress().toString()

    return new Client(app, identifier, privatekey)

  }

  async getBalance(): Promise<Integer> {

    let { body } = await http.get(`${apiBase}/apps/${this.app.identifier}/clients/${this.identifier}`)

    return body.balance

  }

  async chargeCredit(params: ChargeCredit): Promise<ChargeCredit> {

    var response;

    try {

      response = await http
        .post(`${apiBase}/clients/${this.identifier}/calls`)
        .set(this.authenticate())
        .send(params)

      return response.body

    } catch(error) {

      if (error.response.statusCode === 401) {

        throw new NotAuthorized()

      }

      if (error.response.statusCode === 402) {

        throw new PaymentRequired(error.response.body)

      } else {

        console.error(error)

        throw error

      }

    }

  }

  private buildPayment(utxos, paymentRequest) {

    let inputs = utxos.map(utxo => {

      return {
        value: utxo.satoshis,
        script: utxo.script,
        txid: utxo.txid,
        outputIndex: utxo.vout
      }

    })

    return new Promise((resolve, reject) => {

      filepay.build({

        pay: {

          key: this.privatekey.toWIF(),

          inputs,

          to: paymentRequest.outputs.map(output => {
            return {
              script: output.script,
              value: output.amount
            }
          })
        }
      }, (error, transaction) => {

        if (error) { return reject(error) }

        resolve(transaction.serialize())

      });

    })

  }

  async sendPayment(paymentRequest: PaymentRequired): Promise<any> {

    var response;

    try {

      const utxos = await run.blockchain.utxos(this.identifier)

      let transaction = await this.buildPayment(utxos, paymentRequest)

      response = await http
        .post(`${apiBase}/payments`)
        .send({ transaction })

      return response.body

    } catch(error) {

      if (error.response.statusCode === 401) {

        throw new NotAuthorized()

      }

      if (error.response.statusCode === 402) {

        throw new PaymentRequired(error.response.body)

      } else {

        console.error(error)

        throw error

      }

    }

  }

  async buyCredits(credits: Integer): Promise<PaymentRequired> {

    let paymentRequest = await this.requestBuyCredits(credits)

    return this.sendPayment(paymentRequest)

  }

  async requestBuyCredits(credits: Integer): Promise<PaymentRequired> {

    try {

      await http
          .get(`${apiBase}/apps/${this.app.identifier}/clients/${this.identifier}/buy-credits/${credits}`)

    } catch(error) {

      if (error.response.statusCode === 402) {

        return new PaymentRequired(error.response.body)

      } else {

        throw Error()

      }

    }

  }

  private authenticate() {

    const message =  JSON.stringify({
      nonce: uuid.v4(),
      domain: 'get402.com'
    })

    const identifier = this.app.identifier

    const signature = Message.sign(message, this.app.privatekey)

    return {
      'auth-identifier': identifier,
      'auth-message': message,
      'auth-signature': signature
    }

  }

}

export class App {

  identifier: string;
  privatekey: bsv.PrivateKey

  constructor(privatekey: bsv.PrivateKey) {

    this.privatekey = privatekey
    this.identifier = privatekey.toAddress().toString()

  }

  static load(privatekey: string): App {

    return new App(new bsv.PrivateKey(privatekey))

  }

  static createNew(): App {

    return new App(new bsv.PrivateKey())

  }

  createClient(): Client {

    let privatekey = new bsv.PrivateKey()

    return Client.fromPrivateKey(this, privatekey)

  }

  loadClient(identifier: string, privatekey?: bsv.PrivateKey): Client {

    return new Client(this, identifier, privatekey)

  }

}

