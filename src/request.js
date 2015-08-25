

module.exports = createRequestContext;

function createRequestContext(apiClient) {
    return request;

    function request(method, url, data) {
        url = apiClient.url("/server" + url);
        return apiClient.request(method, url, data);
    }
}
