
# Get402 Client Node.js

Build Paid APIs with Ease. This library simplifies offering of APIs that can be accessed only via micropayments

## Installation

```
npm install --save get402
```

## Usage

See https://get402.com/docs.html for complete documentation.

You may import the entire library or load only specific objects as needed.

```

import * as get402 from 'get402'

```

### Authentication

Your Get402 API is identified by a public/private key pair where the public address is used to identify your API and the
private key is used to sign requests to get402.com.

#### Using Existing API Private Key

```

import { App } from 'get402'

const privatekey = process.env.GET402_API_PRIVATE_KEY

const app = App.load(privatekey)

console.app('identifier', app.identifier)


```

#### Generating A New API PrivateKey

```

import { App } from 'get402'

const app = App.createNew();

console.log('privatekey', app.privatekey)

console.log('identifier', app.identifier)


```

One you load your app using its private key there is no more work to do, all signing of requests is handled
automatically by the library.

### Get Client API Key Balance 

All clients start with a balance of zero credits available, which can be queried any time

#### Creating a New Client

```

const client = app.createClient()

console.log('client id', client.identifier)

```

#### Getting Balance For An Existing Client

```

const clientId = process.env.GET402_CLIENT_ID

const client = app.createClient(clientId)

console.log('client id', client.identifier)


```

### Charge Client API Key

When a client uses your API you should charge their API key which reduces their available balance of credits.

```

const clientId = process.env.GET402_CLIENT_ID

const client = app.createClient(clientId)

const result = await client.chargeCredit({ credits: 1 })

console.log(result)

```

If their balance of credits goes to zero you will receive an error including a PaymentRequired request with details
on purchasing additional credits. If you do not want to receive an error here always check the balance first.

```

import { PaymentRequired } from 'get402'

try {

  const client = app.createClient()

  await client.chargeCredit({ credits: 1 })

} catch(result) {
  
  if (result instanceof PaymentRequired) {

    console.log('payment request', result)

  }

}

```


### Add Funds To Client API Key

#### Getting a Payment Request To Buy More Credits

To purchase additional credits simply request a new payment template for any number of credits. You will receive a
standard payment request which wallets know how to fulfill.

```

const client = app.createClient(process.env.GET402_CLIENT_ID, process.env.GET402_CLIENT_PRIVATEKEY)

let paymentRequest = await client.requestBuyCredits(10)

console.log(paymentRequest)

```


#### Using Client Key To Purchase More Credits Directly

Since client API keys are actually public/private key pairs capable of holding funds directly, this library provides
a utility for purchasing new credits using the client private key directly. First you must load your client funds
by sending satoshis to the client identifier address. Once funds arrive they will be available for purchasing credits.

```

const client = app.createClient(process.env.GET402_CLIENT_ID, process.env.GET402_CLIENT_PRIVATEKEY)

let result = await client.buyCredits(10)

console.log(result)

```

Once payment is sent your client API key will immediately be credited with additional credits


## Development & Testing

Development requires the use of typescript.

```
npm install
```

To run the tests you must set `GET402_PRIVATE_KEY` environment variable either in the shell or a `.env` file

```
npm test
```

