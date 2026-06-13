import {
  // getDBExternalAccountInfo,
  getKycInfo,
  getKycInfoFromBridge,
  getVirtualAccountInfo,
  getVirtualAccountInfoFromBridge,
  postExternalAccountInBridge,
  postKycInBridge,
  postVirtualAccountInfoIntoBridge,
  saveQycInfoToSwopDB,
  saveVirtualInfoToSwopDB,
} from '@/actions/bank';
import DynamicPrimaryBtn from '@/components/ui/Button/DynamicPrimaryBtn';
import {
  Modal,
  ModalBody,
  ModalContent,
  Spinner,
} from '@nextui-org/react';
import { Loader } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AiOutlineBank } from 'react-icons/ai';
import { FaPlus, FaRegCopy } from 'react-icons/fa';
import { FaArrowRightLong } from 'react-icons/fa6';
import { MdDone } from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';
import { useSolanaWalletContext } from '@/lib/context/SolanaWalletContext';
import logger from '@/utils/logger';

const AddBankModal = ({ bankShow, setBankShow }: any) => {
  const [stepper, setStepper] = useState('bank-account');
  const [kycLoading, setKycLoading] = useState(false);
  const [externalKycLoading, setExternalKycLoading] = useState(false);
  // const [externalAccountInfo, setExternalAccountInfo] = useState<any>(null);
  // const [kycUrl, setKycUrl] = useState<string | null>(null);
  // const [agreementUrl, setAgreementUrl] = useState<string | null>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [kycDataFetchLoading, setKycDataFetchLoading] =
    useState<boolean>(false);
  const [copiedItem, setCopiedItem] = useState(''); // Track which item was copied
  const [userId, setUserId] = useState('67c428364fe6a38a65a0420b');
  const [virtualResponse, setVirtualResponse] = useState<any>(null);

  const router = useRouter();

  const { solanaWallets } = useSolanaWalletContext();

  const handleAddBank = () => {
    setStepper('bank-account-details');
  };

  logger.debug('stepper', stepper);

  useEffect(() => {
    const getUserId = async () => {
      const userId = Cookies.get('user-id');
      if (userId) {
        setUserId(userId);
      }
    };
    if (window !== undefined) {
      getUserId();
    }
  }, []);

  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    const getAccessToken = async () => {
      const token = Cookies.get('access-token');
      if (token) {
        setAccessToken(token);
      }
    };
    if (window !== undefined) {
      getAccessToken();
    }
  }, []);

  useEffect(() => {
    const getKycData = async () => {
      try {
        setKycDataFetchLoading(true);
        if (userId && accessToken) {
          const info = await getKycInfo(userId, accessToken);
          logger.info('info kyc', info);
          if (
            info &&
            info.success &&
            info.message === 'KYC information available'
          ) {
            setKycData(info.data);
            if (info.data.kyc_status !== 'approved') {
              const options = {
                method: 'GET',
                headers: {
                  accept: 'application/json',
                  'content-type': 'application/json',
                  'Api-Key': process.env.NEXT_PUBLIC_BRIDGE_SECRET,
                },
              };

              const bridgeInfo = await getKycInfoFromBridge(
                options,
                info.data.id
              );

              logger.info('bridgeInfo123', bridgeInfo);

              if (info.data.kyc_status !== bridgeInfo.kyc_status) {
                logger.debug('hiittt');

                await saveQycInfoToSwopDB(bridgeInfo, userId);
                setKycData(bridgeInfo);
              }
            } else if (info.data.kyc_status === 'approved') {
              const virtualData = await getVirtualAccountInfo(
                userId,
                accessToken
              );
              logger.info('virtualData', virtualData);

              if (!virtualData || !virtualData?.success) {
                try {
                  const options = {
                    method: 'GET',
                    headers: {
                      accept: 'application/json',
                      'Api-Key':
                        process.env.NEXT_PUBLIC_BRIDGE_SECRET,
                    },
                  };
                  const virtualResponse =
                    await getVirtualAccountInfoFromBridge(
                      info.data.customer_id,
                      options
                    );
                  logger.info('virtualResponse', virtualResponse);
                  if (virtualResponse) {
                    await saveVirtualInfoToSwopDB(
                      virtualResponse,
                      userId,
                      accessToken
                    );
                    setVirtualResponse(virtualResponse);
                    setStepper('virtual-bank-account');
                  } else {
                    const createVirtualOptions = {
                      method: 'POST',
                      headers: {
                        accept: 'application/json',
                        'Idempotency-Key': uuidv4(),
                        'content-type': 'application/json',
                        'Api-Key':
                          process.env.NEXT_PUBLIC_BRIDGE_SECRET,
                      },
                      body: JSON.stringify({
                        source: { currency: 'usd' },
                        destination: {
                          currency: 'usdc',
                          payment_rail: 'solana',
                          address: solanaWallets?.[0]?.address, //solana wallet
                        },
                        developer_fee_percent: '0.5',
                      }),
                    };
                    const res =
                      await postVirtualAccountInfoIntoBridge(
                        info.data.customer_id,
                        createVirtualOptions
                      );
                    if (res) {
                      const getVitualAccount =
                        await getVirtualAccountInfoFromBridge(
                          info.data.customer_id,
                          options
                        );
                      await saveVirtualInfoToSwopDB(
                        getVitualAccount,
                        userId,
                        accessToken
                      );
                    }
                    logger.info('res for post into bridge', res);
                    setVirtualResponse(res);
                    setStepper('virtual-bank-account');
                  }
                } catch (error) {
                  logger.error(
                    'Error in virtual account process:',
                    error
                  );
                }
              } else {
                setStepper('virtual-bank-account');
                setVirtualResponse(virtualData);
              }
            }
          }
        }
      } catch (error) {
        logger.error('kyc db data fetching error', error);
      } finally {
        setKycDataFetchLoading(false);
      }
    };
    getKycData();
  }, [accessToken, solanaWallets, userId]);

  const handleKycLink = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const accountType = formData.get('accountType') as string;

    if (!firstName) {
      return toast.error('First Name is Required!');
    }
    if (!lastName) {
      return toast.error('Last Name is Required!');
    }
    if (!email) {
      return toast.error('Email is Required!');
    }
    if (!accountType) {
      return toast.error('Please select account type');
    }

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Idempotency-Key': uuidv4(),
        'Content-Type': 'application/json',
        'Api-Key': process.env.NEXT_PUBLIC_BRIDGE_SECRET || '', // Ensure the environment variable is correctly named
      },
      body: JSON.stringify({
        type: accountType,
        full_name: `${firstName} ${lastName}`,
        email: email,
        redirect_uri: 'https://www.swopme.app/wallet',
      }),
    };

    setKycLoading(true);

    try {
      const data = await postKycInBridge(options);
      logger.info('data for kyc', data);

      if (data.code && data.code === 'invalid_parameters') {
        toast.error('Invalid data, Please submit valid information!');
        return;
      }

      if (data?.kyc_link && data?.tos_link) {
        await saveQycInfoToSwopDB(data, userId); // Ensure this function is defined
        // setKycUrl(data.kyc_link);
        // setAgreementUrl(data.tos_link);
        setStepper('kyc-success'); // Add a new step for KYC success

        router.push(
          data.tos_link +
            '&redirect_uri=' +
            encodeURIComponent(data.kyc_link)
        );

        // window.open(
        //   data.tos_link + "&redirect_uri=" + encodeURIComponent(data.kyc_link)
        // );

        // router.push(data.kyc_link + "&redirect-uri=" + data.tos_link);
      } else if (data?.existing_kyc_link?.kyc_link) {
        await saveQycInfoToSwopDB(data.existing_kyc_link, userId); // Ensure this function is defined
        // await dispatch({
        //   type: SEND_PARENT_PROFILE_INFO,
        //   payload: { data: { ...user_Data.data, kyc: data } },
        // });
        // setKycUrl(data.existing_kyc_link.kyc_link);
        // setAgreementUrl(data.existing_kyc_link.tos_link);
        setStepper('kyc-success'); // Add a new step for KYC success
        router.push(
          data.existing_kyc_link.tos_link +
            '&redirect_uri=' +
            encodeURIComponent(data.existing_kyc_link.kyc_link)
        );
        // window.open(
        //   data.existing_kyc_link.tos_link +
        //     "&redirect_uri=" +
        //     encodeURIComponent(data.existing_kyc_link.kyc_link)
        // );
      }
    } catch (err) {
      logger.error('Error fetching KYC link:', err);
      toast.error('An error occurred while processing your request.');
    } finally {
      setKycLoading(false);
    }
  };

  const handleAddExternalAccount = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setExternalKycLoading(true);
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const bankName = formData.get('bankName') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const routingNumber = formData.get('routingNumber') as string;
    const checkingOrSavings = formData.get(
      'checkingOrSavings'
    ) as string;
    const streetLine1 = formData.get('streetLine1') as string;
    const streetLine2 = formData.get('streetLine2') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const postalCode = formData.get('postalCode') as string;
    const countryCode = formData.get('countryCode') as string;
    if (!firstName) {
      return toast.error('First Name is Required!');
    }
    if (!lastName) {
      return toast.error('Last Name is Required!');
    }
    if (kycData && kycData.customer_id) {
      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Idempotency-Key': uuidv4(),
          'content-type': 'application/json',
          'Api-Key': process.env.NEXT_PUBLIC_BRIDGE_SECRET || '',
        },
        body: JSON.stringify({
          account: {
            account_number: accountNumber,
            routing_number: routingNumber,
            checking_or_savings: checkingOrSavings,
          },
          address: {
            street_line_1: streetLine1,
            street_line_2: streetLine2,
            city: city,
            state: state,
            postal_code: postalCode,
            country: countryCode,
          },
          currency: 'usd',
          bank_name: bankName,
          account_owner_name: firstName + ' ' + lastName,
          account_type: 'us',
          account_owner_type: 'individual',
          first_name: firstName,
          last_name: lastName,
        }),
      };

      try {
        const response = await postExternalAccountInBridge(
          kycData.customer_id,
          options
        );
        logger.info('External account response:', response);
      } catch (error) {
        logger.error('Error creating external account:', error);
      } finally {
        setExternalKycLoading(false);
      }
    }
  };

  // Utility function to handle copying and state updates
  const handleCopy = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId); // Set the copied item ID
      setTimeout(() => setCopiedItem(''), 2000); // Reset after 2 seconds
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  // Function to copy all details at once
  const handleCopyAllDetails = async () => {
    const allDetails = `Bank Routing Number: ${virtualResponse.data.accounts[0].source_deposit_instructions.bank_routing_number}\nBank Account Number: ${virtualResponse.data.accounts[0].source_deposit_instructions.bank_account_number}\nBank Name: ${virtualResponse.data.accounts[0].source_deposit_instructions.bank_name}\nBank Beneficiary Name: ${virtualResponse.data.accounts[0].source_deposit_instructions.bank_beneficiary_name}`;
    await handleCopy(allDetails, 'all');
  };

  return (
    <div>
      <Modal
        size={
          stepper === 'bank-account-details' ||
          stepper === 'external-account-details'
            ? '2xl'
            : 'md'
        }
        isOpen={bankShow}
        onOpenChange={setBankShow}
      >
        <ModalContent>
          <div className="w-full">
            <ModalBody className="text-center text-gray-700 py-6">
              {stepper === 'bank-account' && (
                <div>
                  {kycDataFetchLoading ? (
                    <div className="h-[14.5rem] flex items-center justify-center">
                      <Spinner />
                    </div>
                  ) : (
                    <div>
                      {kycData ? (
                        <div className="text-center">
                          <h2 className="text-start text-lg font-semibold mb-2">
                            Bank Account
                          </h2>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                            <div className="w-11 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <AiOutlineBank size={20} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <p className="font-semibold">
                                Status:{' '}
                                <span
                                  className={`capitalize ${
                                    kycData?.kyc_status ===
                                      'not_started' ||
                                    kycData?.kyc_status === 'rejected'
                                      ? 'text-red-600'
                                      : kycData?.kyc_status ===
                                        'approved'
                                      ? 'text-green-600'
                                      : 'text-yellow-600'
                                  }`}
                                >
                                  {kycData?.kyc_status}
                                </span>
                              </p>

                              <p className="text-gray-400">
                                {kycData.kyc_status === 'rejected'
                                  ? kycData?.rejection_reasons[0]
                                      ?.reason
                                  : 'KYC verification is required to proceed.'}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`${
                              kycData?.tos_link
                            }&redirect_uri=${encodeURIComponent(
                              kycData?.kyc_link
                            )}`}
                            target="_blank"
                          >
                            <DynamicPrimaryBtn
                              // onClick={handleRedirectKyc}
                              className="mx-auto mt-3"
                            >
                              {kycData.kyc_status === 'rejected'
                                ? 'Resubmit'
                                : 'Complete KYC'}
                              {/* <Loader className="animate-spin" /> */}
                              <FaArrowRightLong className="ml-1" />
                            </DynamicPrimaryBtn>
                          </a>
                        </div>
                      ) : (
                        <div className="text-center">
                          <h2 className="text-start text-lg font-semibold mb-2">
                            Virtual Bank Account
                          </h2>
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                            <div className="w-11 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <AiOutlineBank size={20} />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <p className="font-semibold">
                                Add virtual account
                              </p>
                              <p className="text-gray-400">
                                You have no added bank account yet
                              </p>
                            </div>
                          </div>
                          <DynamicPrimaryBtn
                            onClick={handleAddBank}
                            className="mx-auto mt-3"
                          >
                            <FaPlus className="mr-1" />
                            Add Virtual Account
                          </DynamicPrimaryBtn>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {stepper === 'bank-account-details' && (
                <div className="flex flex-col items-center gap-6">
                  <h2 className="text-center text-lg font-semibold">
                    Enter Your Bank Account Details
                  </h2>

                  <form onSubmit={handleKycLink} className="w-full">
                    <div className="flex items-start gap-5">
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="firstName">
                            First Name
                            <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            id="firstName"
                            name="firstName"
                            placeholder="Enter First Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="email">
                            Email
                            <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            id="email"
                            name="email"
                            placeholder="Enter Email"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                      </div>
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="lastName">
                            Last Name
                            <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            id="lastName"
                            name="lastName"
                            placeholder="Enter Last Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="accountType">
                            Select Account Type
                            <span className="text-red-600">*</span>
                          </label>
                          <select
                            required
                            id="accountType"
                            name="accountType"
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl py-2.5 px-3 bg-gray-100"
                          >
                            <option value="" disabled>
                              Select Account Type
                            </option>
                            <option value="individual">
                              Individual Account
                            </option>
                            <option value="business">
                              Business Account
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <DynamicPrimaryBtn
                      type={'submit'}
                      className="mx-auto px-9 mt-6"
                    >
                      Next Step
                      {kycLoading ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <FaArrowRightLong className="ml-1" />
                      )}
                    </DynamicPrimaryBtn>
                  </form>
                </div>
              )}
              {stepper === 'external-account-details' && (
                <div className="flex flex-col items-center gap-6">
                  <h2 className="text-center text-lg font-semibold">
                    Enter Your Bank Account Details
                  </h2>

                  <form
                    onSubmit={handleAddExternalAccount}
                    className="w-full"
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="bankName">Bank Name</label>
                          <input
                            type="text"
                            required
                            id="bankName"
                            name="bankName"
                            placeholder="Enter Bank Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="firstName">
                            First Name
                          </label>
                          <input
                            type="text"
                            required
                            id="firstName"
                            name="firstName"
                            placeholder="Enter Last Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="lastName">Last Name</label>
                          <input
                            type="text"
                            required
                            id="lastName"
                            name="lastName"
                            placeholder="Enter Last Name"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="accountNumber">
                            Account Number
                          </label>
                          <input
                            type="text"
                            required
                            id="accountNumber"
                            name="accountNumber"
                            placeholder="Enter Account Number"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="routingNumber">
                            Routing Number
                          </label>
                          <input
                            type="text"
                            required
                            id="routingNumber"
                            name="routingNumber"
                            placeholder="Enter Routing Number"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="checkingOrSavings">
                            Checking or Savings
                          </label>
                          <select
                            required
                            id="checkingOrSavings"
                            name="checkingOrSavings"
                            className="w-full border border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl py-2.5 px-3 bg-gray-100"
                          >
                            <option value="" disabled>
                              Select Checking or Savings
                            </option>
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </select>
                        </div>
                      </div>
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="streetLine1">
                            Street Line 1
                          </label>
                          <input
                            type="text"
                            required
                            id="streetLine1"
                            name="streetLine1"
                            placeholder="Enter Street Line 1"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="streetLine2">
                            Street Line 2
                          </label>
                          <input
                            type="text"
                            required
                            id="streetLine2"
                            name="streetLine2"
                            placeholder="Enter Street Line 2"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="city">City</label>
                          <input
                            type="text"
                            required
                            id="city"
                            name="city"
                            placeholder="Enter City"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="state">State</label>
                          <input
                            type="text"
                            required
                            id="state"
                            name="state"
                            placeholder="Enter State"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="postalCode">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            required
                            id="postalCode"
                            name="postalCode"
                            placeholder="Enter Postal Code"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <label htmlFor="countryCode">
                            Country Code
                          </label>
                          <input
                            type="text"
                            required
                            id="countryCode"
                            name="countryCode"
                            placeholder="Enter Country Code"
                            className="w-full border appearance-none pr-2 border-[#ede8e8] focus:border-[#e5e0e0] rounded-xl focus:outline-none pl-4 py-2 text-gray-700 bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                    <DynamicPrimaryBtn
                      type={'submit'}
                      className="mx-auto px-5 mt-6"
                    >
                      Submit
                      {externalKycLoading ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <FaArrowRightLong className="ml-1" />
                      )}
                    </DynamicPrimaryBtn>
                  </form>
                </div>
              )}
              {stepper === 'virtual-bank-account' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center relative">
                    <AiOutlineBank size={20} />
                    <Image
                      src={'/images/us-flag-logo.png'}
                      alt="us flag"
                      width={20}
                      height={20}
                      className="absolute -top-0.5 -right-0.5"
                    />
                  </div>
                  <div className="pb-5 border-b-2 border-dashed w-full">
                    <h2 className="text-center text-xl font-semibold">
                      Virtual US Bank Account
                    </h2>
                    <p className="text-gray-400 text-xs">
                      Accept ACH Push & Wire Payments
                    </p>
                    <div className="mt-2 flex items-center gap-1 justify-center">
                      <span className="border border-gray-300 px-4 py-1 text-xs rounded-full">
                        <span className="text-gray-400">Fees</span>{' '}
                        0.5%
                      </span>
                      <span className="border border-gray-300 px-4 py-1 text-xs rounded-full">
                        <span className="text-gray-400">
                          Min.transfer
                        </span>{' '}
                        $2
                      </span>
                    </div>
                  </div>
                  <div className="w-full text-start flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400">
                          Bank Routing Number
                        </p>
                        <p>
                          {
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_routing_number
                          }
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            virtualResponse.data.accounts[0]
                              ?.source_deposit_instructions
                              ?.bank_routing_number,
                            'routing'
                          )
                        }
                      >
                        {copiedItem === 'routing' ? (
                          <MdDone color="green" />
                        ) : (
                          <FaRegCopy color="gray" />
                        )}
                      </button>
                    </div>

                    {/* Bank Account Number */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400">
                          Bank Account Number
                        </p>
                        <p>
                          {
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_account_number
                          }
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_account_number,
                            'account'
                          )
                        }
                      >
                        {copiedItem === 'account' ? (
                          <MdDone color="green" />
                        ) : (
                          <FaRegCopy color="gray" />
                        )}
                      </button>
                    </div>

                    {/* Bank Name */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400">Bank Name</p>
                        <p>
                          {
                            virtualResponse.data[0]
                              ?.source_deposit_instructions?.bank_name
                          }
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_name,
                            'bank-name'
                          )
                        }
                      >
                        {copiedItem === 'bank-name' ? (
                          <MdDone color="green" />
                        ) : (
                          <FaRegCopy color="gray" />
                        )}
                      </button>
                    </div>

                    {/* Bank beneficiary name */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400">
                          Bank Beneficiary Name
                        </p>
                        <p>
                          {
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_beneficiary_name
                          }
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopy(
                            virtualResponse.data[0]
                              ?.source_deposit_instructions
                              ?.bank_beneficiary_name,
                            'bank-beneficiary-name'
                          )
                        }
                      >
                        {copiedItem === 'bank-beneficiary-name' ? (
                          <MdDone color="green" />
                        ) : (
                          <FaRegCopy color="gray" />
                        )}
                      </button>
                    </div>

                    {/* Bank address */}
                    {/* <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400">Bank Address</p>
                          <p>1801 Main St., Kansas City, MO 64108</p>
                        </div>
                        <button
                          onClick={() =>
                            handleCopy(
                              "1801 Main St., Kansas City, MO 64108",
                              "address"
                            )
                          }
                        >
                          {copiedItem === "address" ? (
                            <MdDone color="green" />
                          ) : (
                            <FaRegCopy color="gray" />
                          )}
                        </button>
                      </div> */}
                  </div>
                  <p className="text-xs text-gray-400 px-10 mt-3">
                    For assistance regarding issues with transfers and
                    deposits, reach out to support@bridge.xyz.
                  </p>
                  <DynamicPrimaryBtn
                    onClick={handleCopyAllDetails}
                    className="text-sm"
                  >
                    {copiedItem === 'all' ? (
                      <MdDone size={18} />
                    ) : (
                      <FaRegCopy className="mr-1" />
                    )}{' '}
                    Copy All Details
                  </DynamicPrimaryBtn>
                </div>
              )}
            </ModalBody>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AddBankModal;
