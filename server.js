var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function(request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/
  const session = JSON.parse(fs.readFileSync('./session.json').toString())

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);

  if (path === "/sign_in" && method === "POST") {
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", chunk => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string); // name password
      const user = userArray.find(
        user => user.name === obj.name && user.password === obj.password
      );
      if (user === undefined) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json; charset=utf-8");
      } else {
        response.statusCode = 200;
        const random = Math.random()
        session[random] = {user_id: user.id}
        fs.writeFileSync('./session.json', JSON.stringify(session))
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
      }
      response.end()
    });
  } else if (path === "/home.html") {
    // 写不出来
    const cookie = request.headers["cookie"];
    let sessionId;
    try {
      sessionId = cookie
        .split(";")
        .filter(s => s.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
    } catch (error) {}
    if (sessionId && session[sessionId]) {
      const userId = session[sessionId].user_id
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const user = userArray.find(user => user.id === userId);
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      let string = ''
      if (user) {
        string = homeHtml.replace("{{loginStatus}}", "已登录")
          .replace('{{user.name}}', user.name)
      }
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml.replace("{{loginStatus}}", "未登录")
          .replace('{{user.name}}', '')
      response.write(string);
    }
    response.end()
  } else if (path === "/register" && method === "POST") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", chunk => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string);
      const lastUser = userArray[userArray.length - 1];
      const newUser = {
        // id 为最后一个用户的 id + 1
        id: lastUser ? lastUser.id + 1 : 1,
        name: obj.name,
        password: obj.password
      };
      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
      response.end()
    });
  } else {
    response.statusCode = 200;
    // 默认首页
    const filePath = path === "/" ? "/index.html" : path;
    const index = filePath.lastIndexOf(".");
    // suffix 是后缀
    const suffix = filePath.substring(index);
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg"
    };
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || "text/html"};charset=utf-8`
    );
    let content;
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
