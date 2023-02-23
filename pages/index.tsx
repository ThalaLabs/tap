import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { AptosClient, Types } from "aptos";
import { useEffect, useState } from "react";
import Head from "next/head";
import NextLink from "next/link";
import Image from "next/image";
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Stack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

const TEST_COINS_ACCOUNT =
  "0x03c27315fb69ba6e4b960f1507d1cefcc9a4247869f26a8d59d6b7869d23782c";
const TESTNET_FULLNODE = "https://fullnode.testnet.aptoslabs.com";
const client = new AptosClient(TESTNET_FULLNODE);
const AMOUNT = 1000;

interface CoinInfo {
  name: string;
  symbol: string;
  decimals: number;
}

export default function Home() {
  return (
    <>
      <Head>
        <title>Thala Faucet</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container>
        <Flex align="center">
          <Heading color="white" fontSize="20px">
            Thala Faucet: Claim test coins
          </Heading>
          <Spacer />
          <ConnectWalletModal />
        </Flex>
        <ClaimCoins />
      </Container>
    </>
  );
}

function ConnectWalletModal() {
  const { account, connect, connected, disconnect, wallets } = useWallet();
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <>
      {!connected ? (
        <Button onClick={onOpen} mt="4" colorScheme={"whiteAlpha"}>
          Connect to claim 💡
        </Button>
      ) : (
        <Button onClick={disconnect} mt="4" colorScheme={"whiteAlpha"}>
          {account?.address?.slice(0, 6) + "..." + account?.address?.slice(-4)}
        </Button>
      )}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack>
              {wallets.map((wallet) => (
                <Button
                  key={wallet.name}
                  onClick={() => {
                    connect(wallet.name);
                    onClose();
                  }}
                  disabled={wallet.readyState !== "Installed"}
                >
                  {wallet.name}
                </Button>
              ))}
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

function ClaimCoins() {
  const [coins, setCoins] = useState<CoinInfo[]>([]);

  useEffect(() => {
    async function getCoinInfos() {
      const resources = await client.getAccountResources(TEST_COINS_ACCOUNT);
      const coins = resources.filter((resource) =>
        resource.type.startsWith("0x1::coin::CoinInfo")
      );
      return coins.map((coin) => coin.data as CoinInfo);
    }
    getCoinInfos().then(setCoins);
  }, []);

  return (
    <Flex flexDirection={"column"} mt="10">
      {coins.map((coin, index) => (
        <Claim key={coin.name} coin={coin} />
      ))}
    </Flex>
  );
}

function Claim({ coin }: { coin: CoinInfo }) {
  const { connected, signAndSubmitTransaction } = useWallet();
  const toast = useToast();
  const [txnPending, setTxnPending] = useState(false);

  async function claim() {
    const payload: Types.TransactionPayload = {
      type: "entry_function_payload",
      function: `${TEST_COINS_ACCOUNT}::test_coins::mint_coin`,
      type_arguments: [
        `${TEST_COINS_ACCOUNT}::test_coins::${coin.symbol.toUpperCase()}`,
      ],
      arguments: [(AMOUNT * 10 ** coin.decimals).toFixed(0)],
    };
    try {
      const { hash } = await signAndSubmitTransaction(payload);
      setTxnPending(true);
      await client
        .waitForTransaction(hash, { checkSuccess: true })
        .finally(() => setTxnPending(false));
      toast({
        title: "Transaction submitted.",
        description: (
          <Link
            as={NextLink}
            href={`https://explorer.aptoslabs.com/txn/${hash}?network=testnet`}
            isExternal
          >
            View on explorer <ExternalLinkIcon mx="2px" />
          </Link>
        ),
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.log("error", error);
      toast({
        title: "An error occurred.",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  return (
    <Button
      isLoading={txnPending}
      disabled={!connected}
      onClick={claim}
      colorScheme="whiteAlpha"
    >
      <Grid templateColumns="repeat(12, 1fr)">
        <GridItem colStart={5} colEnd={8} h="100%" display="flex">
          <Image
            src={`/${coin.symbol.toLowerCase()}.png`}
            alt="coin-logo"
            width={20}
            height={20}
            className="block sm:hidden"
          />
          <Box ml="2">
            Claim {AMOUNT} {coin.symbol}
          </Box>
        </GridItem>
      </Grid>
    </Button>
  );
}
