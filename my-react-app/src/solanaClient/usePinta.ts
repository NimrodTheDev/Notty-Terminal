import { PinataSDK } from "pinata";

const apiKey = import.meta.env.VITE_PINATA_JWT;
const gateway = import.meta.env.VITE_IPFS_GATEWAY;

const pinata = new PinataSDK({
  pinataJwt: apiKey,
  pinataGateway: gateway
});

interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: {
    website: string;
    twitter: string;
    discord: string;
  };
}

export async function uploadFile(
  imageFile: File,
  metadata: {
    name: string;
    symbol: string;
    description: string;
    website: string;
    twitter: string;
    discord: string;
  }
): Promise<string> {
  try {
    // First upload the image file
    const imageUpload = await pinata.upload.public.file(imageFile);
    console.log(gateway);
    const imageUrl = `https://${gateway}/ipfs/${imageUpload.cid}`;

    // Create metadata object
    const tokenMetadata: TokenMetadata = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      image: imageUrl,
      external_url: metadata.website,
      attributes: {
        website: metadata.website,
        twitter: metadata.twitter,
        discord: metadata.discord
      }
    };

    // Create a JSON file from the metadata
    const metadataBlob = new Blob([JSON.stringify(tokenMetadata, null, 2)], {
      type: "application/json"
    });
    const metadataFile = new File([metadataBlob], "metadata.json", {
      type: "application/json"
    });

    // Upload the metadata file
    const metadataUpload = await pinata.upload.public.file(metadataFile);
    const metadataUrl = `https://${gateway}/ipfs/${metadataUpload.cid}`;

    return metadataUrl;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    // throw error;
    return "";
  }
}

// await main();
