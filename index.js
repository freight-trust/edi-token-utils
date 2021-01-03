// const Web3 = require('web3')
const debug = require("debug")("index.js");
const S3 = require("aws-sdk/clients/s3");
const erc20ABI = require("./erc20ABI.json");
import { createAlchemyWeb3 } from "@alch/alchemy-web3";

// Using HTTPS
const Web3 = createAlchemyWeb3(
  "https://eth-mainnet.alchemyapi.io/v2/<api-key>"
);

require("dotenv").config();

const nodeUrl = process.env.NODE_URL;

const awsID = process.env.AWS_ID;
const awsSecret = process.env.AWS_SECRET;
const bucketName = process.env.BUCKET_NAME;

const ediAddress = "0x79C5a1Ae586322A07BfB60be36E1b31CE8C84A1e";
const contractWallet = "0x0016958b8998d09c0CC8F0C19F5C29Bfc286ea96";
async function run() {
  // Validations
  if (!nodeUrl) {
    debug("NODE_URL cannot be null");
    process.exit(1);
  }

  // AWS S3 Validations
  if (!awsID || !awsSecret || !bucketName) {
    debug("AWS_ID, AWS_SECRET and BUCKET_NAME cannot be null");
    process.exit(1);
  }

  const web3 = new Web3(nodeUrl);

  // Check web3 connection works
  let blockNumber;
  try {
    blockNumber = await web3.eth.getBlockNumber();
  } catch (e) {
    debug("NODE_URL doesn't seem to be a valid Ethereum RPC endpoint");
  }

  // Do the business
  const edi = new web3.eth.Contract(erc20ABI, ediAddress);
  const ediSupply = web3.utils.toBN(await edi.methods.totalSupply().call());

  debug(`totalSupply: ${ediSupply.toString()}`);

  const daoVestingBalance = web3.utils.toBN(
    await edi.methods.balanceOf(vestingDAO).call()
  );
  const ltdVestingBalance = web3.utils.toBN(
    await edi.methods.balanceOf(vestingLTD).call()
  );

  debug(`daoVestingBalance: ${daoVestingBalance.toString()}`);
  debug(`ltdVestingBalance: ${ltdVestingBalance.toString()}`);

  const circulatingSupply = ediSupply
    .sub(daoVestingBalance)
    .sub(ltdVestingBalance);
  const circulatingSupplyInteger = Math.floor(
    web3.utils.fromWei(circulatingSupply, "ether")
  );

  debug(`circulatingSupply: ${circulatingSupply.toString()}`);
  debug(`circulatingSupplyInteger: ${circulatingSupplyInteger.toString()}`);

  // Small check to prevent uploading buggy numbers
  if (circulatingSupplyInteger < 1.5e6) {
    debug("Circulating supply cannot be correct, will iedire the S3 upload");
    process.exit(1);
  }

  // Upload result to S3
  debug("upload result to S3");
  const s3 = new S3({
    accessKeyId: awsID,
    secretAccessKey: awsSecret,
  });

  // Setting up S3 upload parameters
  const params = {
    Bucket: bucketName,
    Key: "index",
    Body: circulatingSupplyInteger.toString(),
    ContentType: "text/plain",
  };

  s3.upload(params, function (err, data) {
    if (err) {
      throw err;
    }
    debug(`File uploaded successfully. ${data.Location}`);
  });
}

run();
