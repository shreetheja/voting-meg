const signupForm = document.getElementById('signupForm');
const getOtpButton = document.getElementById('get-otp');
const verifyOtpButton = document.getElementById('verify-otp');
const connectWalletButton = document.getElementById('connect-wallet');
const backToPhoneLink = document.getElementById('back-to-phone');
const backToOtpLink = document.getElementById('back-to-otp');
const phoneNumberSection = document.getElementById('phone-number-section');
const otpSection = document.getElementById('otp-section');
const setPasswordSection = document.getElementById('set-password-section');
const walletSection = document.getElementById('wallet-section');
const walletAddressDisplay = document.getElementById('wallet-address');

// Variable to hold the wallet address
let walletAddress = null;

// Step 1: Get OTP
getOtpButton.addEventListener('click', () => {
    const phoneNumber = document.getElementById('phone-number').value;

    if (!phoneNumber) {
        alert('Please enter your phone number');
        return;
    }

    fetch(`http://127.0.0.1:8000/send-otp?phone_number=${encodeURIComponent(phoneNumber)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => {
            if (response.ok) {
                alert('OTP sent successfully!');
                phoneNumberSection.style.display = 'none';
                otpSection.style.display = 'block';
            } else {
                return response.json().then(err => {
                    throw new Error(err.detail || 'Failed to send OTP');
                });
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
            alert(`Error: ${error.message}`);
        });
});

// Step 2: Verify OTP
verifyOtpButton.addEventListener('click', () => {
    const phoneNumber = document.getElementById('phone-number').value;
    const otp = document.getElementById('otp').value;

    if (!otp) {
        alert('Please enter the OTP');
        return;
    }

    fetch(`http://127.0.0.1:8000/verify-otp?phone_number=${encodeURIComponent(phoneNumber)}&code=${encodeURIComponent(otp)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(err => {
                    throw new Error(err.detail || 'Failed to verify OTP');
                });
            }
        })
        .then(data => {
            if (data.message === 'OTP verified successfully') {
                alert('OTP verified!');
                otpSection.style.display = 'none';
                setPasswordSection.style.display = 'block';
                walletSection.style.display = 'block'; // Show wallet section
            } else {
                throw new Error('OTP verification failed');
            }
        })
        .catch(error => {
            console.error('Error:', error.message);
            alert(`Error: ${error.message}`);
        });
});

// Step 3: Connect Wallet
connectWalletButton.addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            walletAddress = accounts[0];
            walletAddressDisplay.innerText = `Connected Wallet: ${walletAddress}`;
            alert('Wallet connected successfully!');
        } catch (error) {
            console.error('Error connecting wallet:', error.message);
            alert('Failed to connect wallet. Please try again.');
        }
    } else {
        alert('MetaMask is not installed. Please install MetaMask and try again.');
    }
});

// Step 4: Complete Signup
signupForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const phoneNumber = document.getElementById('phone-number').value;
    const password = document.getElementById('password').value;

    if (!password) {
        alert('Please enter a password');
        return;
    }

    if (!walletAddress) {
        alert('Please connect your wallet before completing signup.');
        return;
    }

    fetch(`http://127.0.0.1:8000/set-password?phone_number=${encodeURIComponent(phoneNumber)}
    &password=${encodeURIComponent(password)}&wallet_address=${encodeURIComponent(walletAddress)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else {
                return response.json().then(err => {
                    throw new Error(err.detail || 'Failed to set password');
                });
            }
        })
        .then(data => {
            alert('Signup successful! Redirecting to login...');
            window.location.replace('index');
        })
        .catch(error => {
            console.error('Error:', error.message);
            alert(`Error: ${error.message}`);
        });
});

// Back Links
backToPhoneLink.addEventListener('click', () => {
    otpSection.style.display = 'none';
    phoneNumberSection.style.display = 'block';
});

backToOtpLink.addEventListener('click', () => {
    setPasswordSection.style.display = 'none';
    otpSection.style.display = 'block';
});
