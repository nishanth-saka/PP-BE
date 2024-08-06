const axios = require('axios')
const qs = require('qs')

const accessTokenCookieOptions = {
    maxAge: 90000, //15min
    httpOnly: true,
    domain: process.env.CLIENT_DOMAIN,
    path: '/',
    sameSite: 'strict',
    secure: false
}

const refreshTokenCookieOptions = {
    ...accessTokenCookieOptions,
    maxAge: 3.154e10, // 1yr

}

const getGoogleOAuthToken = async (code) => {
    const values = {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URL,
        grant_type: 'authorization_code'
    }

    try {
        const response = await axios.post(process.env.GOOGLE_OAUTH_TOKEN_URL, qs.stringify(values), {
            header: { "content-type": "application/x-www-form-urlencoded" }
        })
       
        return response.data;
    } catch (error) {
        console.warn(`getGoogleOAuthToken ERR:`, error)
        return error
    }
}

const getGoogleUser = async ( id_token, access_token ) => {
    try {
        const response = await axios.get(`${process.env.GOOGLE_OAUTH_USER_URL}?alt=json&access_token=${access_token}`, {
            headers: {
                Authorization: `Bearer ${id_token}`
            }
        })
     
        return response.data;        
    } catch (error) {
        console.warn(`getGoogleUser ERR:`, error.data)
        return error
    }
}


module.exports = {
    getGoogleOAuthToken,
    getGoogleUser,
    accessTokenCookieOptions,
    refreshTokenCookieOptions
}