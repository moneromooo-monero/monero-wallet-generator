window.onbeforeunload = function (e) {
	return '';
};
function poor_mans_kdf(str) {
	var hex = cnBase58.bintohex(cnBase58.strtobin(str));
	for (var n = 0; n < 10000; ++n)
		hex = keccak_256(cnBase58.hextobin(hex));
	return hex;
}
current_lang = 'english';
keys = null;
function genwallet(lang) {
	if (keys && !confirm('Are you sure? This wallet cannot be recovered once a new wallet is generated.')) {
		return;
	}
	spend_key_widget = document.getElementById("spend_key_widget");
	view_key_widget = document.getElementById("view_key_widget");
	address_widget = document.getElementById("address_widget");
	address_qr_widget = document.getElementById("address_qr_widget");
	mnemonic_widget = document.getElementById("mnemonic_widget");
	user_entropy_widget = document.getElementById("user_entropy_widget")

	if (lang != null) {
		current_lang = lang;
	}
	else {
		var user_entropy = user_entropy_widget.value;
		if (user_entropy === "") {
			seed = cnUtil.sc_reduce32(cnUtil.rand_32());
		}
		else {
			seed = cnUtil.sc_reduce32(poor_mans_kdf(user_entropy));
		}
		keys = cnUtil.create_address(seed);
	}
	mnemonic = mn_encode(seed, current_lang);

	spend_key_widget.innerHTML = keys.spend.sec;
	view_key_widget.innerHTML = keys.view.sec;
	address_widget.innerHTML = cnUtil.pubkeys_to_string(keys.spend.pub, keys.view.pub);
	address_qr_widget.innerHTML = "";
	mnemonic_widget.innerHTML = mnemonic;

	// only monero has the URI scheme
	if (prefix_widget.value == "4") {
		qr = new QRCode(address_qr_widget, { correctLevel: QRCode.CorrectLevel.L });
		qr.makeCode("monero:" + keys.public_addr);
	}
	else {
		qr = null;
	}
}

previous_button_text = "";
prefix = "";
function genwallet_prefix_worker() {
	attempts = 0;
	while (true) {
		attempts++;
		seed = cnUtil.sc_reduce32(cnUtil.rand_32());
		keys = cnUtil.create_address_if_prefix(seed, prefix);
		if (keys != null) {
			gen_prefix_widget = document.getElementById("gen_prefix_widget");
			prefix_widget = document.getElementById("prefix_widget");
			gen_prefix_widget.value = previous_button_text;
			prefix_widget.disabled = false;
			generating = false;
			break;
		}
		if (attempts == 10) {
			if (generating)
				setTimeout(genwallet_prefix_worker, 0);
			return;
		}
	}
	mnemonic = mn_encode(seed, current_lang);

	spend_key_widget = document.getElementById("spend_key_widget");
	view_key_widget = document.getElementById("view_key_widget");
	address_widget = document.getElementById("address_widget");
	mnemonic_widget = document.getElementById("mnemonic_widget");

	spend_key_widget.innerHTML = keys.spend.sec;
	view_key_widget.innerHTML = keys.view.sec;
	address_widget.innerHTML = keys.public_addr;
	address_qr_widget.innerHTML = "";
	mnemonic_widget.innerHTML = mnemonic;

	qr = new QRCode(address_qr_widget, { correctLevel: QRCode.CorrectLevel.L });
	qr.makeCode("monero:" + keys.public_addr);
}

var zerohex = "0000000000000000000000000000000000000000000000000000000000000000";
var ffhex = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function is_valid_prefix(prefix) {
	if (prefix.length <= 0 || prefix.length >= 95)
		return false;
	var lowest_address = cnUtil.pubkeys_to_string(zerohex, zerohex);
	var highest_address = cnUtil.pubkeys_to_string(ffhex, ffhex);
	var lowest = lowest_address.substr(0, prefix.length);
	var highest = highest_address.substr(0, prefix.length);
	if (prefix < lowest)
		return false;
	if (prefix > highest)
		return false;
	return true;
}

function check_prefix_validity() {
	gen_prefix_widget = document.getElementById("gen_prefix_widget");
	prefix_widget = document.getElementById("prefix_widget");
	if (gen_prefix_widget.value == "STOP")
		return;
	prefix = prefix_widget.value;
	if (is_valid_prefix(prefix)) {
		gen_prefix_widget.value = "Generate wallet with prefix";
		gen_prefix_widget.disabled = false;
	}
	else {
		gen_prefix_widget.value = "Invalid prefix";
		gen_prefix_widget.disabled = true;
	}
}

generating = false;
function genwallet_prefix() {
	gen_prefix_widget = document.getElementById("gen_prefix_widget");
	prefix_widget = document.getElementById("prefix_widget");
	if (generating) {
		generating = false;
		gen_prefix_widget.value = previous_button_text;
		prefix_widget.disabled = false;
	}
	else {
		prefix_widget = document.getElementById("prefix_widget");
		prefix = prefix_widget.value;
		prefix.trim();
		if (prefix.length < 2) {
			alert("Bad prefix should be at least two characters");
			return;
		}
		if (!is_valid_prefix(prefix)) {
			alert("Bad prefix " + prefix + " is not a valid address prefix");
			return;
		}

		generating = true;
		previous_button_text = gen_prefix_widget.value;
		gen_prefix_widget.value = "STOP";
		prefix_widget.disabled = true;
		setTimeout(genwallet_prefix_worker, 0);
	}
}

function checkEntropy() {
	var good = true;
	var button = document.getElementById("gen_with_custom_entropy_button")
	var user_entropy_widget = document.getElementById("user_entropy_widget")
	var user_entropy = user_entropy_widget.value;
	var user_entropy_warning_widget = document.getElementById("user_entropy_warning_widget")
	if (user_entropy.length === 0) {
		user_entropy_warning_widget.style.display = "none"
		return
	}

	var count = new Int32Array(256);
	for (var n = 0; n < 256; ++n)
		count[n] = 0
	for (var n = 0; n < user_entropy.length; ++n)
		count[user_entropy.charCodeAt(n)]++;
	var e = 0
	for (var n = 0; n < 256; ++n) {
		if (count[n] > 0) {
			var p = count[n] / user_entropy.length
			p *= Math.log(p) / Math.log(2)
			e -= p
		}
	}
	e *= user_entropy.length
	if (e < 128)
		good = false
	if (good)
		user_entropy_warning_widget.style.display = "none"
	else
		user_entropy_warning_widget.style.display = "block"
}

function toggle_qr() {
	address_qr_widget = document.getElementById("address_qr_widget");
	spend_key_widget = document.getElementById("spend_key_widget");
	view_key_widget = document.getElementById("view_key_widget");
	mnemonic_widget = document.getElementById("mnemonic_widget");
	if (address_qr_widget.style.display == "block") {
		address_qr_widget.style.display = "none";
		spend_key_widget.style.display = "block";
		view_key_widget.style.display = "block";
		mnemonic_widget.style.display = "block";
	}
	else {
		address_qr_widget.style.display = "block";
		spend_key_widget.style.display = "none";
		view_key_widget.style.display = "none";
		mnemonic_widget.style.display = "none";
	}
}

function enableElement(id, enable) {
	var el = document.getElementById(id)
	if (el) {
		if (enable)
			el.disabled = false;
		else
			el.disabled = true;
	}
}

function enableLanguage(code, enable) {
	enableElement("lang_" + code, enable)
}

function setCoin(index) {
	var enable
	var language
	prefix_widget = document.getElementById("prefix_widget");
	if (index == 0) {
		cnUtil = cnUtilGen(moneroConfig);
		prefix_widget.value = "4";
		enable = true
		language = "english"
	}
	else if (index == 1) {
		cnUtil = cnUtilGen(aeonConfig);
		prefix_widget.value = "W";
		enable = false
		language = "electrum"
	}
	enableLanguage("en", enable)
	enableLanguage("es", enable)
	enableLanguage("pt", enable)
	enableLanguage("jp", enable)
	enableElement("show_qr_code", enable)
	genwallet(language);
}

genwallet();