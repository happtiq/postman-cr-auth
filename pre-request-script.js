/* This script auto-generates a Google OAuth token from a Service Account key,
 * and stores that token in accessToken variable in Postman.
 *
 * Prior to invoking it, please paste the contents of the key JSON
 * into serviceAccountKey variable in a Postman environment.
 *
 * Then, paste the script into the "Pre-request Script" section
 * of a Postman request or collection.
 *
 * The script will cache and reuse the token until it's within
 * a margin of expiration defined in EXPIRES_MARGIN.
 *
 * Thanks to:
 * https://github.com/happtiq/postman-cr-auth
 * https://paw.cloud/docs/examples/google-service-apis
 * https://developers.google.com/identity/protocols/OAuth2ServiceAccount#authorizingrequests
 * https://gist.github.com/madebysid/b57985b0649d3407a7aa9de1bd327990
 * https://github.com/postmanlabs/postman-app-support/issues/1607#issuecomment-401611119
 * https://medium.com/@stephen.darling/oauth2-authentication-with-google-cloud-run-700015a092c2
 * https://medium.com/kinandcartacreated/google-authentication-with-postman-12943b63e76a
 */

const ENV_SERVICE_ACCOUNT_KEY = 'serviceAccountKey';
const ENV_JS_RSA_SIGN = 'jsrsasign';
const ENV_TOKEN_EXPIRES_AT = 'tokenExpiresAt';
const ENV_ACCESS_TOKEN = 'accessToken';
const CLOUD_RUN_URL = 'cloudRunUrl';

const JS_RSA_SIGN_SRC = 'https://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js';
const GOOGLE_OAUTH = 'https://www.googleapis.com/oauth2/v4/token';

const EXPIRES_MARGIN = 300; // seconds before expiration

const getVar = name =>
    pm.variables.get(name);

const getEnv = name =>
    pm.environment.get(name);

const setEnv = (name, value) =>
    pm.environment.set(name, value);

const getJWS = callback => {
    // workaround for compatibility with jsrsasign
    const navigator = {};
    const window = {};

    let jsrsasign = getEnv(ENV_JS_RSA_SIGN);
    if (jsrsasign) {
        eval(jsrsasign);
        return callback(null, KJUR.jws.JWS);
    }

    pm.sendRequest(JS_RSA_SIGN_SRC, (err, res) => {
        if (err) return callback(err);

        jsrsasign = res.text();
        setEnv(ENV_JS_RSA_SIGN, jsrsasign);
        eval(jsrsasign);
        callback(null, KJUR.jws.JWS);
    });
};

const getJwt = ({ client_email, private_key }, iat, callback) => {
    getJWS((err, JWS) => {
        if (err) return callback(err);

        const header = {
            typ: 'JWT',
            alg: 'RS256',
        };

        const exp = iat + 3600;
        const payload = {
            iss: client_email,
            sub: client_email,
            target_audience: getVar(CLOUD_RUN_URL),
            aud: GOOGLE_OAUTH,
            iat,
            exp,
        };

        const jwt = JWS.sign(null, header, payload, private_key);
        callback(null, jwt, exp);
    });
};

const getToken = (serviceAccountKey, callback) => {
    const now = Math.floor(Date.now() / 1000);
    if (now + EXPIRES_MARGIN < getEnv(ENV_TOKEN_EXPIRES_AT)) {
        return callback();
    }

    getJwt(serviceAccountKey, now, (err, jwt, exp) => {
        if (err) return callback(err);

        const req = {
            url: GOOGLE_OAUTH,
            method: 'POST',
            header: {
                'Authorization': 'Bearer ' + jwt,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: {
              mode: 'urlencoded',
              urlencoded: [{
                  key: 'grant_type',
                  value: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
              },{
                  key: 'assertion',
                  value: jwt,
              }],
            },
        };

        pm.sendRequest(req, (err, res) => {
            if (err) return callback(err);

            const accessToken = res.json().id_token;
            setEnv(ENV_ACCESS_TOKEN, accessToken);
            setEnv(ENV_TOKEN_EXPIRES_AT, exp);
            callback();
        });
    });
};

const getServiceAccountKey = callback => {
    try {
        const keyMaterial = getEnv(ENV_SERVICE_ACCOUNT_KEY);
        const serviceAccountKey = JSON.parse(keyMaterial);
        callback(null, serviceAccountKey);
    } catch (err) {
        callback(err);
    }
};

getServiceAccountKey((err, serviceAccountKey) => {
    if (err) throw err;

    getToken(serviceAccountKey, err => {
        if (err) throw err;
    });
});