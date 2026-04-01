let wordlist = [];
let wordlistSet = new Set();

const fallbackWordlist = [
    "abacate", "borboleta", "cachorro", "diamante", "elefante", "foguete", "girassol", 
    "horizonte", "inverno", "janela", "kiwi", "labirinto", "montanha", "neblina", 
    "oceano", "passarinho", "quebra", "relampago", "silencio", "tartaruga", "universo", 
    "vagalume", "xadrez", "zumbido"
];

async function loadWordlist() {
    try {
        const response = await fetch('pass.json');
        wordlist = await response.json();
    } catch (err) {
        wordlist = fallbackWordlist;
    }
    wordlistSet = new Set(wordlist.map(w => w.toLowerCase()));
}

document.addEventListener('DOMContentLoaded', loadWordlist);

function getRandomIntSecure(max) {
    if (max <= 0 || !Number.isInteger(max)) {
        return 0;
    }
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return Math.floor((randomBuffer[0] / (0xFFFFFFFF + 1)) * max);
}

function shuffleArraySecure(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = getRandomIntSecure(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const UNICODE_CHARS = 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
const AMBIGUOUS_CHARS = 'Il1O0';

function generatePassword(silent = false) {
    let password = '';
    let entropy = 0;

    if (state.mode === 'password') {
        const options = {
            length: parseInt(elements.lengthValue?.value || '24'),
            useLowercase: elements.useLowercase?.checked || false,
            useUppercase: elements.useUppercase?.checked || false,
            useNumbers: elements.useNumbers?.checked || false,
            useSpecial: elements.useSpecial?.checked || false,
            useSpaces: elements.useSpaces?.checked || false,
            useUnicode: elements.useUnicode?.checked || false,
            excludeAmbiguous: elements.excludeAmbiguous?.checked || false,
            atLeastOneOfEach: elements.atLeastOneOfEach?.checked || false
        };

        password = generateRandomPassword(options);
        entropy = calculatePasswordEntropy(password, options);
    } else if (state.mode === 'passphrase') {
        password = generatePassphrase();
        const separator = elements.separator?.value || ' ';
        entropy = calculatePassphraseEntropy(password, separator);
    } else if (state.mode === 'master') {
        return;
    }

    state.currentPassword = password;

    if (elements.passwordOutput) {
        elements.passwordOutput.value = state.passwordVisible ? state.currentPassword : '•'.repeat(state.currentPassword.length);
    }

    updateEntropyDisplay(entropy);

    if (!silent && state.mode !== 'master') {
        showNotification('Sucesso', 'Nova senha gerada!');
    }
}

function generateRandomPassword(options) {
    let charset = '';

    if (options.useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (options.useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.useNumbers) charset += '0123456789';
    if (options.useSpecial) charset += SPECIAL_CHARS;
    if (options.useSpaces) charset += ' ';
    if (options.useUnicode) charset += UNICODE_CHARS;

    if (options.excludeAmbiguous) {
        const ambiguousRegex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
        charset = charset.replace(ambiguousRegex, '');
    }

    if (!charset) {
        charset = 'abcdefghijklmnopqrstuvwxyz';
    }

    let password = '';

    if (options.atLeastOneOfEach) {
        const requiredChars = [];
        let avLower = 'abcdefghijklmnopqrstuvwxyz';
        let avUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let avNum = '0123456789';
        let avSpec = SPECIAL_CHARS;
        let avUni = UNICODE_CHARS;

        if (options.excludeAmbiguous) {
            const ambiguousRegex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
            avLower = avLower.replace(ambiguousRegex, '');
            avUpper = avUpper.replace(ambiguousRegex, '');
            avNum = avNum.replace(ambiguousRegex, '');
            avSpec = avSpec.replace(ambiguousRegex, '');
            avUni = avUni.replace(ambiguousRegex, '');
        }

        if (options.useLowercase && avLower) requiredChars.push(avLower[getRandomIntSecure(avLower.length)]);
        if (options.useUppercase && avUpper) requiredChars.push(avUpper[getRandomIntSecure(avUpper.length)]);
        if (options.useNumbers && avNum) requiredChars.push(avNum[getRandomIntSecure(avNum.length)]);
        if (options.useSpecial && avSpec) requiredChars.push(avSpec[getRandomIntSecure(avSpec.length)]);
        if (options.useUnicode && avUni) requiredChars.push(avUni[getRandomIntSecure(avUni.length)]);

        for (const char of requiredChars) {
            password += char;
        }

        for (let i = password.length; i < options.length; i++) {
            password += charset[getRandomIntSecure(charset.length)];
        }

        const passwordArray = password.split('');
        shuffleArraySecure(passwordArray);
        password = passwordArray.join('');
    } else {
        for (let i = 0; i < options.length; i++) {
            password += charset[getRandomIntSecure(charset.length)];
        }
    }

    return password;
}

function generateRandomPseudoWord(minSyllables = 2, maxSyllables = 4) {
    const VOGAIS = "aeiou";
    const CONSOANTES = "bcdfghjklmnpqrstvwxyz";
    let word = "";
    const numSyllables = getRandomIntSecure(maxSyllables - minSyllables + 1) + minSyllables;

    for (let i = 0; i < numSyllables; i++) {
        const consoante = CONSOANTES[getRandomIntSecure(CONSOANTES.length)];
        const vogal = VOGAIS[getRandomIntSecure(VOGAIS.length)];
        word += consoante + vogal;
    }
    return word;
}

function generatePassphrase(options = {}) {
    const wordCount = parseInt(elements.wordCountValue?.value || '6');
    const capitalization = elements.capitalization?.value || 'lowercase';
    const separator = elements.separator?.value || ' ';
    const mode = document.getElementById('passphraseMode')?.value || 'diceware';

    if (wordlist.length === 0 && (mode === 'diceware' || mode === 'hybrid')) {
        return "Erro: A lista de palavras não está disponível.";
    }

    const words = [];
    for (let i = 0; i < wordCount; i++) {
        let word;

        switch (mode) {
            case 'random':
                word = generateRandomPseudoWord(2, 3);
                break;
            case 'hybrid':
                if (getRandomIntSecure(2) === 0) {
                    const randomIndex = getRandomIntSecure(wordlist.length);
                    word = wordlist[randomIndex];
                } else {
                    word = generateRandomPseudoWord(2, 3);
                }
                break;
            case 'diceware':
            default:
                const randomIndex = getRandomIntSecure(wordlist.length);
                word = wordlist[randomIndex];
                break;
        }

        switch (capitalization) {
            case 'uppercase': word = word.toUpperCase(); break;
            case 'title': word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); break;
            default: word = word.toLowerCase();
        }
        words.push(word);
    }
    return words.join(separator);
}

function calculatePasswordEntropy(password, options) {
    if (!password) return 0;

    let poolForEntropy = '';
    if (options.useLowercase) poolForEntropy += 'abcdefghijklmnopqrstuvwxyz';
    if (options.useUppercase) poolForEntropy += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.useNumbers) poolForEntropy += '0123456789';
    if (options.useSpecial) poolForEntropy += SPECIAL_CHARS;
    if (options.useSpaces) poolForEntropy += ' ';
    if (options.useUnicode) poolForEntropy += UNICODE_CHARS;

    if (options.excludeAmbiguous) {
        const ambiguousRegex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
        poolForEntropy = poolForEntropy.replace(ambiguousRegex, '');
    }

    const charSetSize = new Set(poolForEntropy).size;
    if (charSetSize === 0) return 0;
    return Math.log2(charSetSize) * password.length;
}

function calculatePassphraseEntropy(passphrase, separator) {
    if (!passphrase) return 0;
    
    const words = passphrase.split(separator);
    let totalEntropy = 0;
    const mode = document.getElementById('passphraseMode')?.value || 'diceware';

    const entropyDiceware = Math.log2(wordlist.length || 1);
    const entropyPerSyllable = Math.log2(21 * 5);

    for (const word of words) {
        if (wordlistSet.has(word.toLowerCase())) {
            totalEntropy += entropyDiceware;
        } else {
            const numSyllables = word.length / 2;
            totalEntropy += numSyllables * entropyPerSyllable;
        }
    }

    return totalEntropy;
}

function getEntropyDescription(entropy) {
    if (entropy < 40) return 'Muito fraca – Pode ser quebrada quase na hora.';
    if (entropy < 60) return 'Fraca – Aguenta um pouco, mas cai fácil com ataques rápidos.';
    if (entropy < 80) return 'Moderada – Dá trabalho, mas com esforço é possível quebrar em alguns dias.';
    if (entropy < 100) return 'Forte – Difícil de quebrar, levaria anos para conseguir.';
    if (entropy < 128) return 'Muito forte – Um desafio pesado, mesmo para ataques bem planejados.';
    if (entropy < 258) return 'Segura – Aguenta firme, difícil até para ataques bem persistentes.';
    if (entropy <= 500) return 'Ultra segura – Um verdadeiro pesadelo para quem tentar quebrar.';
    return 'Fortíssima – Resiste até às técnicas mais avançadas que possam existir.';
}

function generateBinaryKey(sizeInBytes) {
    if (sizeInBytes <= 0 || !Number.isInteger(sizeInBytes)) {
        return new Uint8Array(0);
    }
    const randomBytes = new Uint8Array(sizeInBytes);
    window.crypto.getRandomValues(randomBytes);
    return randomBytes;
}

function downloadKeyfile(keyData, filename = 'keyfile.bin') {
    const blob = new Blob([keyData], { type: 'application/octet-stream' });

    if (window.Website2APK && typeof window.Website2APK.openExternalUrl === 'function') {
        const reader = new FileReader();
        reader.onloadend = function() {
            window.Website2APK.openExternalUrl(reader.result);
        };
        reader.readAsDataURL(blob);
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

function getKeyEntropyDescription(entropy) {
    if (entropy < 128) return 'Fraca - Tamanho insuficiente para segurança criptográfica.';
    if (entropy < 192) return 'Moderada - Aceitável para alguns usos, mas pode ser melhor.';
    if (entropy < 256) return 'Forte - Boa para a maioria dos usos criptográficos.';
    if (entropy >= 256) return 'Muito Forte - Excelente para segurança criptográfica máxima.';
    return 'Desconhecida';
}

function updateKeyfileSizeInfo() {
    if (!elements.keyfileSizeValue) return;
    const size = parseInt(elements.keyfileSizeValue.value || '64');
    const bits = size * 8;
    const entropy = bits;

    let description = `${size} bytes = ${bits} bits - ${getKeyEntropyDescription(entropy)}`;

    if (elements.keyfileSizeInfo) {
        elements.keyfileSizeInfo.textContent = description;
    }

    if (elements.keyfileEntropyInfo && elements.keyfileEntropyInfo.style.display !== 'none') {
        if (elements.keyfileEntropyValue) elements.keyfileEntropyValue.textContent = `Entropia: ${entropy} bits`;
        if (elements.keyfileEntropyDescription) elements.keyfileEntropyDescription.textContent = getKeyEntropyDescription(entropy);
    }
}

async function generateDeterministicPassword(masterPassword, identifier, personalSalt, length, options) {
    if (!masterPassword || !identifier) {
        throw new Error('Senha mestra e identificador são obrigatórios');
    }

    const combinedSalt = identifier + (personalSalt || '');
    const encoder = new TextEncoder();

    try {
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw', encoder.encode(masterPassword), { name: 'PBKDF2' }, false, ['deriveBits']
        );

        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: encoder.encode(combinedSalt),
                iterations: 1000000,
                hash: 'SHA-512'
            },
            keyMaterial,
            Math.max(512, length * 16)
        );

        const bytes = new Uint8Array(derivedBits);
        return convertBitsToPassword(bytes, length, options);
    } catch (error) {
        throw new Error('Falha ao derivar a chave.');
    }
}

function convertBitsToPassword(bytes, length, options) {
    let charset = '';
    if (options.useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (options.useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.useNumbers) charset += '0123456789';
    if (options.useSpecial) charset += SPECIAL_CHARS;
    if (options.useUnicode) charset += UNICODE_CHARS;

    if (options.excludeAmbiguous) {
        const ambiguousRegex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
        charset = charset.replace(ambiguousRegex, '');
    }

    if (!charset) {
        throw new Error('Pelo menos um tipo de caractere deve ser selecionado.');
    }

    let password = '';
    let byteIndex = 0;
    const maxValid = 256 - (256 % charset.length);

    while (password.length < length) {
        let randomByte;
        if (byteIndex < bytes.length) {
            randomByte = bytes[byteIndex++];
        } else {
            randomByte = bytes[byteIndex % bytes.length];
            byteIndex++;
            password += charset[randomByte % charset.length];
            continue;
        }

        if (randomByte < maxValid) {
            password += charset[randomByte % charset.length];
        }
    }

    if (options.atLeastOneOfEach) {
        password = ensureCharacterTypes(password, options, bytes);
    }

    return password;
}

function ensureCharacterTypes(password, options, bytes) {
    let result = password.split('');
    let byteIndex = password.length;

    const getNextByte = () => {
        byteIndex = (byteIndex + 1) % bytes.length;
        return bytes[byteIndex];
    };

    const types = [
        { option: 'useLowercase', chars: 'abcdefghijklmnopqrstuvwxyz', regex: /[a-z]/ },
        { option: 'useUppercase', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', regex: /[A-Z]/ },
        { option: 'useNumbers', chars: '0123456789', regex: /[0-9]/ },
        { option: 'useSpecial', chars: SPECIAL_CHARS, regex: new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`) },
        { option: 'useUnicode', chars: UNICODE_CHARS, regex: new RegExp(`[${UNICODE_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`) }
    ];

    for (const type of types) {
        if (options[type.option] && !type.regex.test(result.join(''))) {
            let availableChars = type.chars;
            if (options.excludeAmbiguous) {
                const ambiguousRegex = new RegExp(`[${AMBIGUOUS_CHARS}]`, 'g');
                availableChars = availableChars.replace(ambiguousRegex, '');
            }

            if (availableChars.length > 0) {
                const positionToReplace = getNextByte() % result.length;
                const newChar = availableChars[getNextByte() % availableChars.length];
                result[positionToReplace] = newChar;
            }
        }
    }
    return result.join('');
}

const VibrationSystem = {
    enabled: false,
    duration: 15,
    init() {
        if ('vibrate' in navigator) this.enabled = true;
    },
    vibrate(customDuration = null) {
        if (this.enabled) navigator.vibrate(customDuration || this.duration);
    }
};
VibrationSystem.init();

const elements = {
    passwordTab: document.getElementById('password-tab'),
    passphraseTab: document.getElementById('passphrase-tab'),
    keyfileTab: document.getElementById('keyfile-tab'),
    masterTab: document.getElementById('master-tab'),
    passwordDisplayArea: document.getElementById('passwordDisplayArea'),
    passwordOutput: document.getElementById('passwordOutput'),
    toggleVisibilityBtn: document.getElementById('toggleVisibilityBtn'),
    copyBtn: document.getElementById('copyBtn'),
    entropyBar: document.getElementById('entropyBar'),
    entropyValue: document.getElementById('entropyValue'),
    entropyDescription: document.getElementById('entropyDescription'),
    passwordLength: document.getElementById('passwordLength'),
    lengthValue: document.getElementById('lengthValue'),
    useLowercase: document.getElementById('useLowercase'),
    useUppercase: document.getElementById('useUppercase'),
    useNumbers: document.getElementById('useNumbers'),
    useSpecial: document.getElementById('useSpecial'),
    useSpaces: document.getElementById('useSpaces'),
    useUnicode: document.getElementById('useUnicode'),
    atLeastOneOfEach: document.getElementById('atLeastOneOfEach'),
    excludeAmbiguous: document.getElementById('excludeAmbiguous'),
    wordCount: document.getElementById('wordCount'),
    wordCountValue: document.getElementById('wordCountValue'),
    capitalization: document.getElementById('capitalization'),
    separator: document.getElementById('separator'),
    generateBtn: document.getElementById('generateBtn'),
    generateBtnMobile: document.getElementById('generateBtnMobile'),
    generatePhraseBtn: document.getElementById('generatePhraseBtn'),
    generatePassphraseBtnMobile: document.getElementById('generatePassphraseBtnMobile'),
    keyfileSize: document.getElementById('keyfileSize'),
    keyfileSizeValue: document.getElementById('keyfileSizeValue'),
    keyfileSizeInfo: document.getElementById('keyfileSizeInfo'),
    keyfileSize64: document.getElementById('keyfileSize64'),
    keyfileSize128: document.getElementById('keyfileSize128'),
    keyfileSize256: document.getElementById('keyfileSize256'),
    keyfileEntropyInfo: document.getElementById('keyfileEntropyInfo'),
    keyfileEntropyBar: document.getElementById('keyfileEntropyBar'),
    keyfileEntropyValue: document.getElementById('keyfileEntropyValue'),
    keyfileEntropyDescription: document.getElementById('keyfileEntropyDescription'),
    generateKeyfileBtn: document.getElementById('generateKeyfileBtn'),
    masterPassword: document.getElementById('masterPassword'),
    toggleMasterPasswordBtn: document.getElementById('toggleMasterPasswordBtn'),
    masterIdentifier: document.getElementById('masterIdentifier'),
    masterSalt: document.getElementById('masterSalt'),
    toggleMasterSaltBtn: document.getElementById('toggleMasterSaltBtn'),
    masterPasswordLength: document.getElementById('masterPasswordLength'),
    masterLengthValue: document.getElementById('masterLengthValue'),
    masterUseLowercase: document.getElementById('masterUseLowercase'),
    masterUseUppercase: document.getElementById('masterUseUppercase'),
    masterUseNumbers: document.getElementById('masterUseNumbers'),
    masterUseSpecial: document.getElementById('masterUseSpecial'),
    masterUseUnicode: document.getElementById('masterUseUnicode'),
    masterExcludeAmbiguous: document.getElementById('masterExcludeAmbiguous'),
    masterAtLeastOneOfEach: document.getElementById('masterAtLeastOneOfEach'),
    generateMasterBtn: document.getElementById('generateMasterBtn'),
    notificationToast: document.getElementById('notificationToast'),
    toastTitle: document.getElementById('toastTitle'),
    toastMessage: document.getElementById('toastMessage')
};

const state = {
    mode: 'password',
    passwordVisible: false,
    currentPassword: ''
};

let bootstrapToast = null;
if(elements.notificationToast) {
    bootstrapToast = new bootstrap.Toast(elements.notificationToast, {
        autohide: true,
        delay: 4000
    });
}

document.addEventListener('DOMContentLoaded', function() {
    hidePassword();
    generatePassword(true);
    updateKeyfileSizeInfo();

    elements.passwordTab?.addEventListener('click', () => switchMode('password'));
    elements.passphraseTab?.addEventListener('click', () => switchMode('passphrase'));
    elements.keyfileTab?.addEventListener('click', () => switchMode('keyfile'));
    elements.masterTab?.addEventListener('click', () => switchMode('master'));

    elements.passwordLength?.addEventListener('input', handlePasswordLengthChange);
    elements.lengthValue?.addEventListener('change', handlePasswordLengthInputChange);
    elements.wordCount?.addEventListener('input', handleWordCountChange);
    elements.wordCountValue?.addEventListener('change', handleWordCountInputChange);
    elements.capitalization?.addEventListener('change', () => generatePassword());
    elements.separator?.addEventListener('change', () => generatePassword());
    document.getElementById('passphraseMode')?.addEventListener('change', () => generatePassword());
    elements.keyfileSize?.addEventListener('input', handleKeyfileSizeChange);
    elements.keyfileSizeValue?.addEventListener('change', handleKeyfileSizeInputChange);
    elements.keyfileSize64?.addEventListener('click', () => setKeyfileSize(64));
    elements.keyfileSize128?.addEventListener('click', () => setKeyfileSize(128));
    elements.keyfileSize256?.addEventListener('click', () => setKeyfileSize(256));
    elements.generateKeyfileBtn?.addEventListener('click', handleGenerateKeyfile);

    elements.toggleVisibilityBtn?.addEventListener('click', togglePasswordVisibility);
    elements.copyBtn?.addEventListener('click', handleCopyPassword);
    elements.generateBtn?.addEventListener('click', () => { VibrationSystem.vibrate(); generatePassword(); });
    elements.generateBtnMobile?.addEventListener('click', () => { VibrationSystem.vibrate(); generatePassword(); });
    elements.generatePhraseBtn?.addEventListener('click', () => { VibrationSystem.vibrate(); generatePassword(); });
    elements.generatePassphraseBtnMobile?.addEventListener('click', () => { VibrationSystem.vibrate(); generatePassword(); });

    const charTypeCheckboxes = [elements.useLowercase, elements.useUppercase, elements.useNumbers, elements.useSpecial, elements.useSpaces, elements.useUnicode];
    charTypeCheckboxes.forEach(checkbox => checkbox?.addEventListener('change', () => {
        const atLeastOneChecked = [elements.useLowercase, elements.useUppercase, elements.useNumbers, elements.useSpecial, elements.useSpaces, elements.useUnicode].some(cb => cb?.checked);
        if (!atLeastOneChecked) {
            elements.useLowercase.checked = true;
            showNotification('Aviso', 'Pelo menos um tipo de caractere deve ser selecionado.', 'warning');
        }
        generatePassword();
    }));
    elements.atLeastOneOfEach?.addEventListener('change', () => generatePassword());
    elements.excludeAmbiguous?.addEventListener('change', () => generatePassword());

    elements.masterPasswordLength?.addEventListener('input', handleMasterPasswordLengthChange);
    elements.masterLengthValue?.addEventListener('change', handleMasterPasswordLengthInputChange);
    elements.toggleMasterPasswordBtn?.addEventListener('click', () => toggleInputVisibility(elements.masterPassword, elements.toggleMasterPasswordBtn));
    elements.toggleMasterSaltBtn?.addEventListener('click', () => toggleInputVisibility(elements.masterSalt, elements.toggleMasterSaltBtn));
    elements.generateMasterBtn?.addEventListener('click', handleGenerateMasterPassword);
});

function switchMode(newMode) {
    if (state.mode === newMode) return;
    state.mode = newMode;
    VibrationSystem.vibrate();

    if (newMode === 'keyfile') {
        elements.passwordDisplayArea.style.display = 'none';
    } else {
        elements.passwordDisplayArea.style.display = 'block';
    }

    if (newMode === 'password' || newMode === 'passphrase') {
        generatePassword(true);
    } else if (newMode === 'master') {
        state.currentPassword = '';
        elements.passwordOutput.value = '';
        updateEntropyDisplay(0);
    }
}

function handlePasswordLengthChange() {
    elements.lengthValue.value = elements.passwordLength.value;
    generatePassword();
    VibrationSystem.vibrate();
}

function handlePasswordLengthInputChange() {
    elements.passwordLength.value = elements.lengthValue.value;
    generatePassword();
    VibrationSystem.vibrate();
}

function handleWordCountChange() {
    elements.wordCountValue.value = elements.wordCount.value;
    generatePassword();
    VibrationSystem.vibrate();
}

function handleWordCountInputChange() {
    elements.wordCount.value = elements.wordCountValue.value;
    generatePassword();
    VibrationSystem.vibrate();
}

function handleKeyfileSizeChange() {
    elements.keyfileSizeValue.value = elements.keyfileSize.value;
    updateKeyfileSizeInfo();
    VibrationSystem.vibrate();
}

function handleKeyfileSizeInputChange() {
    elements.keyfileSize.value = elements.keyfileSizeValue.value;
    updateKeyfileSizeInfo();
    VibrationSystem.vibrate();
}

function setKeyfileSize(size) {
    elements.keyfileSize.value = size;
    elements.keyfileSizeValue.value = size;
    updateKeyfileSizeInfo();
    VibrationSystem.vibrate();
}

function handleGenerateKeyfile() {
    const size = parseInt(elements.keyfileSizeValue.value || '64');
    try {
        const keyData = generateBinaryKey(size);
        downloadKeyfile(keyData, 'keyfile.bin');
        showNotification('Sucesso', `Arquivo keyfile.bin de ${size} bytes gerado!`);
        VibrationSystem.vibrate(50);
        if (elements.keyfileEntropyInfo) {
            elements.keyfileEntropyInfo.style.display = 'flex';
            setTimeout(() => {
                elements.keyfileEntropyInfo.style.display = 'none';
            }, 5000);
        }
    } catch (error) {
        showNotification('Erro', 'Falha ao gerar o arquivo de chave.', 'danger');
    }
}

function handleMasterPasswordLengthChange() {
    elements.masterLengthValue.value = elements.masterPasswordLength.value;
    VibrationSystem.vibrate();
}

function handleMasterPasswordLengthInputChange() {
    elements.masterPasswordLength.value = elements.masterLengthValue.value;
    VibrationSystem.vibrate();
}

async function handleGenerateMasterPassword() {
    const masterPassword = elements.masterPassword.value;
    const identifier = elements.masterIdentifier.value;
    const personalSalt = elements.masterSalt.value;
    const length = parseInt(elements.masterLengthValue.value);

    if (!masterPassword || !identifier) {
        showNotification('Atenção', 'Senha mestra e identificador são obrigatórios.', 'warning');
        return;
    }

    const options = {
        useLowercase: elements.masterUseLowercase.checked,
        useUppercase: elements.masterUseUppercase.checked,
        useNumbers: elements.masterUseNumbers.checked,
        useSpecial: elements.masterUseSpecial.checked,
        useUnicode: elements.masterUseUnicode.checked,
        excludeAmbiguous: elements.masterExcludeAmbiguous.checked,
        atLeastOneOfEach: elements.masterAtLeastOneOfEach.checked
    };

    elements.generateMasterBtn.disabled = true;
    elements.generateMasterBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gerando...';

    try {
        const password = await generateDeterministicPassword(masterPassword, identifier, personalSalt, length, options);
        state.currentPassword = password;
        elements.passwordOutput.value = state.passwordVisible ? state.currentPassword : '•'.repeat(state.currentPassword.length);
        const entropy = calculatePasswordEntropy(password, options);
        updateEntropyDisplay(entropy);
        showNotification('Sucesso', 'Senha determinística gerada!');
    } catch (error) {
        showNotification('Erro', error.message, 'danger');
    } finally {
        elements.generateMasterBtn.disabled = false;
        elements.generateMasterBtn.innerHTML = '<i class="fas fa-key me-2"></i>Gerar Senha Determinística';
    }
}

function togglePasswordVisibility() {
    state.passwordVisible = !state.passwordVisible;
    if (state.passwordVisible) {
        showPassword();
        setTimeout(hidePassword, 10000);
        showNotification('Aviso', 'A senha será ocultada em 10 segundos.', 'info');
    } else {
        hidePassword();
    }
    VibrationSystem.vibrate(20);
}

function toggleInputVisibility(input, button) {
    if (!input || !button) return;
    const icon = button.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

async function handleCopyPassword() {
    const passwordToCopy = state.currentPassword;
    if (!passwordToCopy) return;

    try {
        await navigator.clipboard.writeText(passwordToCopy);

        showNotification('Sucesso', 'Copiado para a área de transferência!');
        VibrationSystem.vibrate(50);
        animateCopyButton(elements.copyBtn);

        if (state.mode === 'master') {
            setTimeout(() => {
                state.currentPassword = '';
                elements.passwordOutput.value = '';
                elements.masterPassword.value = '';
                elements.masterIdentifier.value = '';
                elements.masterSalt.value = '';
                updateEntropyDisplay(0);
            }, 300);
        } else {
            setTimeout(() => generatePassword(true), 500);
        }
    } catch (err) {
        showNotification('Erro', 'Falha ao copiar. Verifique as permissões.', 'danger');
    }
}

function showPassword() {
    if (!elements.passwordOutput) return;
    elements.passwordOutput.style.webkitTextSecurity = 'none';
    elements.passwordOutput.value = state.currentPassword;
    elements.toggleVisibilityBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    state.passwordVisible = true;
}

function hidePassword() {
    if (!elements.passwordOutput) return;
    elements.passwordOutput.style.webkitTextSecurity = 'disc';
    elements.passwordOutput.value = '•'.repeat(state.currentPassword.length);
    elements.toggleVisibilityBtn.innerHTML = '<i class="fas fa-eye"></i>';
    state.passwordVisible = false;
}

function animateCopyButton(button) {
    if (!button) return;
    button.classList.add('copied');
    setTimeout(() => button.classList.remove('copied'), 1000);
}

function updateEntropyDisplay(entropy) {
    if (!elements.entropyBar || !elements.entropyValue || !elements.entropyDescription) return;

    const roundedEntropy = Math.round(entropy);
    elements.entropyValue.textContent = `Entropia: ${roundedEntropy} bits`;
    elements.entropyDescription.textContent = getEntropyDescription(roundedEntropy);

    const percentage = Math.min(100, (roundedEntropy / 128) * 100);
    elements.entropyBar.style.width = `${percentage}%`;

    let colorClass = 'bg-danger';
    if (roundedEntropy >= 128) colorClass = 'bg-success';
    else if (roundedEntropy >= 80) colorClass = 'bg-warning';
    else if (roundedEntropy >= 60) colorClass = 'bg-info';

    elements.entropyBar.className = `progress-bar ${colorClass}`;
}

function showNotification(title, message, type = 'success') {
    if (!elements.toastTitle || !elements.toastMessage || !bootstrapToast) return;

    let icon = 'fas fa-check-circle text-success';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle text-warning';
    else if (type === 'danger') icon = 'fas fa-times-circle text-danger';
    else if (type === 'info') icon = 'fas fa-info-circle text-info';

    elements.toastTitle.innerHTML = `<i class="${icon} me-2"></i>${title}`;
    elements.toastMessage.textContent = message;

    bootstrapToast.show();
}

let deferredPrompt;
const installPwaContainer = document.getElementById('installPwaContainer');
const installPwaBtn = document.getElementById('installPwaBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPwaContainer) {
        installPwaContainer.classList.remove('d-none');
    }
});

if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showNotification('Aviso', 'A instalação não está disponível neste momento.', 'warning');
            return;
        }

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            showNotification('Sucesso', 'Aplicativo instalado com sucesso!', 'success');
            VibrationSystem.vibrate(100);
        } else {
            showNotification('Info', 'Instalação cancelada pelo usuário.', 'info');
        }

        deferredPrompt = null;

        if (installPwaContainer) {
            installPwaContainer.classList.add('d-none');
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (installPwaContainer) {
        installPwaContainer.classList.add('d-none');
    }
    showNotification('Sucesso', 'Aplicativo instalado e pronto para uso!', 'success');
    deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}