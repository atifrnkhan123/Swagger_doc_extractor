let tableData = [];
let matrixData = {
    uniqueControllers: 0,
    totalEndpoints: 0,
    getCount: 0,
    postCount: 0,
    patchCount: 0,
    deleteCount: 0
};

document.getElementById('swaggerUrl').addEventListener('input', function() {
    const errorElem = document.getElementById('error');
    if (this.value.trim()) {
        errorElem.textContent = '';
    }
});

async function loadSwagger() {
    // Retrieve and trim the URL from the input field.
    let url = document.getElementById('swaggerUrl').value.trim();
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const tableContainer = document.getElementById('tableContainer');
    const matrixContainer = document.getElementById('matrixContainer');
    if (!url) {
        error.textContent = "Please enter valid JSON URL";
        return;
    }
        const validUrlRegex = /^https:\/\/.*(\/docs|\/api|\.json)$/i;

    // If URL doesn't match the allowed pattern, try to trim extra characters.
    if (!validUrlRegex.test(url)) {
        // If URL contains ".json", remove any extra characters after it.
        if (url.toLowerCase().includes('.json')) {
            url = url.replace(/(\.json).*$/i, '$1');
        }
        // Else if URL contains "/api", remove any extra characters after it.
        else if (url.toLowerCase().includes('/api')) {
            url = url.replace(/(\/api).*$/i, '$1');
        }
        // Else if URL contains "/docs", remove any extra characters after it.
        else if (url.toLowerCase().includes('/docs')) {
            url = url.replace(/(\/docs).*$/i, '$1');
        }
    }
    document.getElementById('swaggerUrl').value = url;
    if (!validUrlRegex.test(url)) {
        error.textContent = "Please enter a valid JSON URL (must start with https:// and end with '/docs', '/api', or '.json')";
        return;
    }

    error.textContent = '';
    tableContainer.innerHTML = '';
    matrixContainer.innerHTML = '';
    tableData = [];
    resetMatrixData();
    document.getElementById('downloadBtn').style.display = 'none';
    loading.style.display = 'block';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        // Check the response's Content-Type header to ensure it's JSON.
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("The URL did not return valid JSON. It appears to be HTML content.");
        }

        const swaggerData = await response.json();
        processSwaggerData(swaggerData);
        renderMatrix();
        renderTable();
        document.getElementById('downloadBtn').style.display = 'block';
    } catch (err) {
        error.textContent = `Error: ${err.message}`;
    } finally {
        loading.style.display = 'none';
    }
}

function resetMatrixData() {
    matrixData = {
        uniqueControllers: 0,
        totalEndpoints: 0,
        getCount: 0,
        postCount: 0,
        patchCount: 0,
        deleteCount: 0
    };
}

function processSwaggerData(swaggerData) {
    let serialNo = 1;
    const uniqueControllers = new Set();

    Object.entries(swaggerData.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, details]) => {
            const controller = details.tags?.[0] || 'Other';
            uniqueControllers.add(controller);

            // Update matrix data.
            matrixData.totalEndpoints++;
            const upperMethod = method.toUpperCase();
            if (upperMethod === 'GET') matrixData.getCount++;
            if (upperMethod === 'POST') matrixData.postCount++;
            if (upperMethod === 'PATCH') matrixData.patchCount++;
            if (upperMethod === 'DELETE') matrixData.deleteCount++;

            const parameters = details.parameters || [];

            const rowData = {
                serialNo: serialNo++,
                controller: controller,
                endpointName: details.operationId || path.split('/').pop() || 'N/A',
                endpoint: path,
                method: upperMethod,
                headers: parameters.filter(p => p.in === 'header')
                    .map(p => `${p.name}${p.required ? '*' : ''}`)
                    .join(', '),
                queryParams: parameters.filter(p => p.in === 'query')
                    .map(p => `${p.name}${p.required ? '*' : ''}`)
                    .join(', '),
                requestBody: getRequestBodyDetails(details.requestBody, method)
            };

            tableData.push(rowData);
        });
    });

    matrixData.uniqueControllers = uniqueControllers.size;
}

function renderMatrix() {
    const matrixContainer = document.getElementById('matrixContainer');
    matrixContainer.innerHTML = `
        <div class="matrix-item">
            <div class="matrix-icon">
                <i class="fas fa-cubes"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">Controllers</div>
                <div class="matrix-count">${matrixData.uniqueControllers}</div>
            </div>
        </div>

        <div class="matrix-item">
            <div class="matrix-icon">
                <i class="fas fa-link"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">Endpoints</div>
                <div class="matrix-count">${matrixData.totalEndpoints}</div>
            </div>
        </div>

        <div class="matrix-item get">
            <div class="matrix-icon">
                <i class="fas fa-download"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">GET Methods</div>
                <div class="matrix-count">${matrixData.getCount}</div>
            </div>
        </div>

        <div class="matrix-item post">
            <div class="matrix-icon">
                <i class="fas fa-upload"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">POST Methods</div>
                <div class="matrix-count">${matrixData.postCount}</div>
            </div>
        </div>

        <div class="matrix-item patch">
            <div class="matrix-icon">
                <i class="fas fa-pencil-alt"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">PATCH Methods</div>
                <div class="matrix-count">${matrixData.patchCount}</div>
            </div>
        </div>

        <div class="matrix-item delete">
            <div class="matrix-icon">
                <i class="fas fa-trash"></i>
            </div>
            <div class="matrix-content">
                <div class="matrix-title">DELETE Methods</div>
                <div class="matrix-count">${matrixData.deleteCount}</div>
            </div>
        </div>
    `;
}

function getRequestBodyDetails(requestBody, method) {
    if (method.toLowerCase() === 'get') return 'N/A';
    if (!requestBody) return 'N/A';

    try {
        const content = requestBody.content || {};
        const mediaType = Object.keys(content)[0] || 'N/A';
        if (mediaType === 'N/A') return 'N/A';

        const schema = content[mediaType].schema;
        if (!schema) return 'N/A';

        return JSON.stringify(parseSchema(schema), null, 2);
    } catch {
        return 'N/A';
    }
}

function parseSchema(schema, indent = 0) {
    if (schema.properties) {
        const result = {};
        Object.entries(schema.properties).forEach(([name, prop]) => {
            result[name] = {
                type: prop.type || 'object',
                required: prop.required ? 'Yes' : 'No',
                ...(prop.properties ? { properties: parseSchema(prop, indent + 1) } : {})
            };
        });
        return result;
    }

    if (schema.items) {
        return [parseSchema(schema.items)];
    }

    if (schema.$ref) {
        return { $ref: schema.$ref.split('/').pop() };
    }

    return { type: schema.type || 'unknown' };
}

function renderTable() {
    const tableContainer = document.getElementById('tableContainer');
    tableContainer.innerHTML = `
        <table class="table table-hover align-middle">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Controller</th>
                    <th>Endpoint Name</th>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>Headers</th>
                    <th>Query Params</th>
                    <th>Request Body</th>
                </tr>
            </thead>
            <tbody>
                ${tableData.map(row => `
                    <tr>
                        <td>${row.serialNo}</td>
                        <td>${row.controller}</td>
                        <td>${row.endpointName}</td>
                        <td><code>${row.endpoint}</code></td>
                        <td><span class="badge bg-${getMethodColor(row.method)}">${row.method}</span></td>
                        <td>${row.headers || 'N/A'}</td>
                        <td>${row.queryParams || 'N/A'}</td>
                        <td class="request-body-cell"><pre>${row.requestBody}</pre></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getMethodColor(method) {
    const colors = {
        GET: 'success',
        POST: 'primary',
        PUT: 'warning',
        DELETE: 'danger',
        PATCH: 'info'
    };
    return colors[method] || 'secondary';
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(tableData.map(row => ({
        "S.No": row.serialNo,
        "Controller": row.controller,
        "Endpoint Name": row.endpointName,
        "Endpoint": row.endpoint,
        "Method": row.method,
        "Headers": row.headers,
        "Query Parameters": row.queryParams,
        "Request Body": row.requestBody
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "API Documentation");
    XLSX.writeFile(wb, 'api-documentation.xlsx');
}