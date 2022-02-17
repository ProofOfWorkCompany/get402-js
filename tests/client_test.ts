
require('dotenv').config()

import { App, PaymentRequired, Client } from '../src'

import { expect, assert } from './utils'

import * as bsv from 'bsv'

describe('Get402.com API Client', () => {

  it('should generate a new app with random privatekey and identifier', () => {

    let app: App = App.createNew()

    expect (() => {
      
      new bsv.Address(app.identifier)
      new bsv.PrivateKey(app.privatekey.toWIF())

    }).to.not.throw()

  })

  describe('Unauthenticated Calls', () => {

    it('should get the balance of a new api key client', async () => {

      let app: App = App.createNew()

      let client = app.createClient()

      let balance = await client.getBalance()

      expect(balance).to.be.equal(0)

    })

  })

  describe('Authenticated Calls', () => {

    it('should receive 402 when charging to a client key with zero credits balance', async () => {

      let app: App = App.createNew()

      let client = app.createClient()

      try {

        let result = await client.chargeCredit({
          credits: 1
        })

      } catch(error) {

        assert(error instanceof PaymentRequired)

        expect(error.memo).to.be.equal('Buy 1000 API calls for 1 USD')

        expect(error.outputs).to.be.an('array')
        expect(error.outputs).to.be.an('array').that.is.not.empty;

      }

    })

  })

  describe('Funding A Client', () => {

    it('should get a payment request for more credits', async () => {

      let app: App = App.createNew()

      let client = app.createClient()

      let balance = await client.getBalance()

      expect(balance).to.be.equal(0)

      let paymentRequest = await client.requestBuyCredits(10)

      expect(paymentRequest.memo).to.be.equal('Buy 10 API calls for 0.01 USD')

      expect(paymentRequest.outputs).to.be.an('array')

      expect(paymentRequest.outputs).to.be.an('array').that.is.not.empty;

    })

    it('should send payment to get more credits', async () => {

      let app: App = App.createNew()

      var privatekey = new bsv.PrivateKey(process.env.GET402_PRIVATE_KEY)

      let client = Client.fromPrivateKey(app, privatekey)

      let balance = await client.getBalance()

      let paymentRequest = await client.requestBuyCredits(10)

      let payment = await client.sendPayment(paymentRequest)

      let newBalance = await client.getBalance()
    
      expect(newBalance).to.be.equal(balance + 10)

      let charge = await client.chargeCredit({
        credits: 1
      })

      let newNewBalance = await client.getBalance()

      expect(newNewBalance).to.be.equal(newBalance - 1)

      await client.chargeCredit({
        credits: 3
      })
      
      let newestBalance = await client.getBalance()

      expect(newestBalance).to.be.equal(newBalance - 4)

    })


  })


})
