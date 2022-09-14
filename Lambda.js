const AWS = require("aws-sdk");
AWS.config.update({
    region: "ap-southeast-1"
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = 'movie-storing';
const infoPath = '/movieinfo';
const getIdPath = '/getnewid';
const getSingleMovie = '/moviedetail'
const getSearch = '/search';
const getAllIds = '/getallid';


exports.handler = async function(event) {
    console.log("Reques event: ", event);

    let response;
    switch (true) {
        case event.httpMethod === 'GET' && event.path === infoPath:
            response = await getMovie();
            break;
            
        case event.httpMethod === 'PATCH' && event.path === infoPath:
            response = await modifyMovie(JSON.parse(event.body));
            break;
            
        case event.httpMethod === 'GET' && event.path === getAllIds:
            response = await getIds();
            break;
            
        case event.httpMethod == 'POST' && event.path === infoPath:
            response = await updateMovie(JSON.parse(event.body));
            break;
            
        case event.httpMethod == 'DELETE' && event.path === infoPath:
            response = await deleteMovie(event.queryStringParameters.movId);
            break;
        
        case event.httpMethod == 'GET' && event.path === getIdPath:
            response = await getNewID();
            break; 
        
        case event.httpMethod == 'GET' && event.path === getSingleMovie:
            response = await getSingleMov(event.queryStringParameters.movId);
            break; 
            
        case event.httpMethod == 'GET' && event.path === getSearch:
            response = await getSearchMov(event.queryStringParameters.searchMov);
            break;
        default:
            response = buildResponse(404, '404');
    }
    return response
}

async function modifyMovie(requestBody) {
    const params = {
        TableName: tableName,
        Key: {
          'id': requestBody.id
        },
        UpdateExpression: set title = :title, release_date = :release_date, vote_average = :vote_average, overview = :overview, youtube_id = :youtube_id,
        ExpressionAttributeValues: {
          ':title': requestBody.title,
          ':release_date': requestBody.release_date,
          ':vote_average': requestBody.vote_average,
          ':overview': requestBody.overview,
          ':youtube_id': requestBody.youtube_id
        },
        ReturnValues: 'UPDATED_NEW'
      }
    
    return await dynamoDb.update(params).promise().then((response) => {
        const body = {
          Operation: 'UPDATE',
          Message: 'SUCCESS',
          UpdatedAttributes: response
        }
        return buildResponse(200, body);
    });
}

async function getIds() {
    const params = {
        TableName: tableName
    }

    const allUsers = await scanDynamoRecords(params, []);
    var idArray = [];
    for (let i = 0; i < allUsers.length; i++) {
        idArray.push(allUsers[i].id);
    }
    idArray.sort();
    
    const body = {
        ids: idArray
    }
    
    return buildResponse(200, body);
}

async function getSearchMov(mov) {
    const searchName= mov.toLowerCase().replace(/\s/g, '');
    
    
    const params = {
        TableName: tableName
    }

    const allUsers = await scanDynamoRecords(params, []);
    if (allUsers.length == 0) {
        const body = {
            newId: 0
        }
    
        return buildResponse(200, body);
    }
    var movResult = [];
    
    for (let i = 0; i < allUsers.length; i++) {
        const compareMov = allUsers[i].title.toLowerCase().replace(/\s/g, '');
        if (compareMov.includes(searchName)) {
            movResult.push(allUsers[i]);
            
        }
    }
    
    const body = {
        movies: movResult
    }

    return buildResponse(200, body);
}

async function deleteMovie(movId) {
    const params = {
        TableName: tableName,
        Key: {
            'id': String(movId)
        },
        ReturnValues: 'ALL_OLD'
    }
    
    return await dynamoDb.delete(params).promise().then((res) => {
        const body =  {
            Operation: 'DELETE',
            Message: 'Success',
            Item: res
        }
        
        return buildResponse(200, body)
    })
}

async function getSingleMov(movId) {
    const params = {
        TableName: tableName
    }

    const allUsers = await scanDynamoRecords(params, []);
    if (allUsers.length == 0) {
        const body = {
            newId: 0
        }
    
        return buildResponse(200, body);
    }
    var movDetail = allUsers[0];
    for (let i = 0; i < allUsers.length; i++) {
        if (allUsers[i].id == String(movId)) {
            movDetail = allUsers[i]
        }
    }
    
    const body = {
        movie: movDetail
    }

    return buildResponse(200, body);
}

async function sortArray(arr) {
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length - 1; j++) {
            if (arr[j] < arr[i]) {
                const tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
        }
    }
}

async function getNewID() {
    const params = {
        TableName: tableName
    }

    const allUsers = await scanDynamoRecords(params, []);
    if (allUsers.length == 0) {
        const body = {
            newId: 0
        }
    
        return buildResponse(200, body);
    }
    
    
    var idArray = [];
    for (let i = 0; i < allUsers.length; i++) {
        idArray.push(parseInt(allUsers[i].id));
    }
    sortArray(idArray)
    
    var pushNewId = -1;
    console.log(idArray)
    for (let i = 1; i < allUsers.length; i++) {
        if (idArray[i].id - idArray[i - 1].id > 1) {
            console.log("IN")
            pushNewId = idArray[i - 1] + 1;
            break;
        }
    }
    
    if (pushNewId == -1) {
        
        pushNewId = idArray[idArray.length - 1] + 1;
    }
    
    if (idArray[0] !== 0) {
        pushNewId = 0;
    }
    
    console.log(pushNewId);
    console.log(idArray);
    
    console.log(pushNewId)
    const body = {
        newId: pushNewId
    }

    return buildResponse(200, body);
}

async function getMovie() {
    const params = {
        TableName: tableName
    }

    const allUsers = await scanDynamoRecords(params, []);
    var maxId = allUsers[0].id;
    var page = 1;
    var maxPages = allUsers.length;
    
    
    
    for (let i = 1; i < allUsers.length; i++) {
        if (allUsers[i].id > maxId) {
            maxId = allUsers[i].id;
        }
    }
    console.log(maxId)
    const body = {
        movies: allUsers
        
    }

    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamoDb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartKey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    }catch (error) {
        console.log("Connection Fail")
    }
}

async function updateMovie(requestBody) {
    const params = {
        TableName: tableName,
        Item: requestBody
    }

    return await dynamoDb.put(params).promise().then(() => {
        const body = {
            Operation: 'Save',
            Message: 'Success',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.log('Fail');
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': "*",
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}