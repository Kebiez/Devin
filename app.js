const express = require('express')
const expressHandlebars = require('express-handlebars')
const session = require('express-session')
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database('database.db')
const bcrypt = require('bcrypt')

const app = express()

app.engine("hbs", expressHandlebars.engine({
    defaultLayout: 'main.hbs'
}))

app.use('/static', express.static("public"))

app.use(express.urlencoded({
    extended: false
}))

app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: 'dfsgjlgdhasjfsadjhergabjhjlöraa'
}))

app.use(function(request, response, next){
    response.locals.session = request.session
    next();
})

const ADMIN_USERNAME = "kevve"
const ADMIN_PASSWORD = "$2b$10$k33C6LOIP.WYjVIIxniog.cCjg5lK2434mkvmxar/SqAtVSSRH.32"

const MIN_TITLE_LENGTH = 5
const MAX_TITLE_LENGTH = 20
const MIN_DESCRIPTION_LENGTH = 5
const MAX_DESCRIPTION_LENGTH = 50
const MIN_MAINCONTENT_LENGTH = 5
const MAX_MAINCONTENT_LENGTH = 100

const MIN_COMMENT_LENGTH = 5
const MAX_COMMENT_LENGTH = 50

function lengthOnContentValidationErrors(title, description, mainContent){
    const validationErrorList = []

    if(title.length < MIN_TITLE_LENGTH){
        validationErrorList.push("The title needs to be longer than " + MIN_TITLE_LENGTH)
    } else if (title.length > MAX_TITLE_LENGTH){
        validationErrorList.push("The title has to be shorter than " + MAX_TITLE_LENGTH)
    }

    if(description.length < MIN_DESCRIPTION_LENGTH){
        validationErrorList.push("The description needs to be longer than " + MIN_DESCRIPTION_LENGTH)
    } else if(description.length > MAX_DESCRIPTION_LENGTH){
        validationErrorList.push("The description has to be shorter than " + MAX_DESCRIPTION_LENGTH)
    }

    if(mainContent.length < MIN_MAINCONTENT_LENGTH){
        validationErrorList.push("The main content needs to be longer than " + MIN_MAINCONTENT_LENGTH)
    } else if(mainContent.length > MAX_MAINCONTENT_LENGTH){
        validationErrorList.push("The main content has to be shorter than " + MAX_MAINCONTENT_LENGTH)
    }

    return validationErrorList
}

function commentLengthValidationErrors(commentContent){
    const validationErrorList = []

    if(commentContent.length < MIN_COMMENT_LENGTH){
        validationErrorList.push("You need to have atleast " + MIN_COMMENT_LENGTH + " character in the comment")
    } else if(commentContent.length > MAX_COMMENT_LENGTH){
        validationErrorList.push("The comment can not be longer than " + MAX_COMMENT_LENGTH + " character long")
    }

    return validationErrorList
}

//------------------database---------------------
db.run(`
    CREATE TABLE IF NOT EXISTS blogposts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        mainContent TEXT,
        date DATE
    )
`)

db.run(`
    CREATE TABLE IF NOT EXISTS projectposts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        mainContent TEXT,
        date DATE
    )
`)

db.run(`
    CREATE TABLE IF NOT EXISTS comments(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blogID INTEGER,
        commentContent TEXT,
        date DATE,
        FOREIGN KEY (blogID) REFERENCES blogposts (id)
    )
`)


//-------------------Simple get pages-------------
app.get('/', function(request, response){

    response.render("home.hbs", {})
})

app.get('/home', function(request,response){

    response.render("home.hbs", {})
})

app.get('/about', function(request,response){

    response.render("about.hbs", {})
})

app.get('/contact', function(request,response){

    response.render("contact.hbs", {})
})

app.get('/internal-server-error', function(request, response){

    response.render("internal-server-error.hbs", {})
})


//-------------blog--------------------
app.get('/blogs-page', function(request, response){
  
    const query = "SELECT * FROM blogposts"

    db.all(query, function(error, blogposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            const model = {
                blogposts
            }
            response.render("blogs-page.hbs", model)
        }
    })
})

app.get('/create-blog', function(request, response){

    let date = new Date().toLocaleDateString()

    const model = {
        date
    }

    response.render("create-blog.hbs", model)
})

app.post('/create-blog', function(request, response){

    const title = request.body.title
    const description = request.body.description
    const mainContent = request.body.mainContent
    const date = request.body.date

    const values = [title, description, mainContent, date]

    const query = "INSERT INTO blogposts(title, description, mainContent, date) VALUES(?, ?, ?, ?)"

    let validationErrors = lengthOnContentValidationErrors(title, description, mainContent)

    if(validationErrors == 0){
        db.run(query, values, function(error){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/blogs-page")
            }
        })
    } else {
        const model = {
            validationErrors,
            title,
            description,
            mainContent,
            date
        }
        response.render("create-blog.hbs", model)
    }
    
})

app.get('/blogs-page/blog-post/:id', function(request, response){

    const id = request.params.id

    const query = "SELECT * FROM blogposts WHERE id = ?"

    const queryComments = "SELECT * FROM comments WHERE blogID = ?"

    const value = [id]

    db.get(query, value, function(error, blogposts){
        db.all(queryComments, value, function(error, comments){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                if(blogposts == undefined){
                    return response.render("page-not-found.hbs")
                }
                const model = {
                    blogposts,
                    comments
                }
                response.render("blog-post.hbs", model)
            }
        })
    })
})

app.get('/blogs-page/blog-post/:id/edit-blog', function(request, response){
    
    const id = request.params.id

    const query = "SELECT * FROM blogposts WHERE id = ?"

    const value = [id]

    db.get(query, value, function(error, blogposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            if(blogposts == undefined){
                return response.render("page-not-found.hbs")
            }
            const model = {
                blogposts
            }
            response.render("edit-blog.hbs", model)
        }
    })

})

app.post('/blogs-page/blog-post/:id/edit-blog', function(request, response){

    const id = request.params.id

    const title = request.body.title
    const description = request.body.description
    const mainContent = request.body.mainContent
    const date = request.body.date

    const values = [title, description, mainContent, date, id]

    const query = "UPDATE blogposts SET title = ?, description = ?, mainContent = ?, date = ? WHERE id = ?"

    let validationErrors = lengthOnContentValidationErrors(title, description, mainContent)

    if(validationErrors == 0){
        db.run(query, values, function(error){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/blogs-page/blog-post/" + id)
            }
        })
    } else {
        const model = {
            validationErrors,
            blogposts: {
                title,
                description,
                mainContent,
                date,
                id
            }
        }
        response.render("edit-blog.hbs", model)
    }
    
})

app.get('/blogs-page/blog-post/:id/delete-blog', function(request, response){

    const id = request.params.id

    const value = [id]

    const query = "SELECT * FROM blogposts WHERE id = ?"

    db.get(query, value, function(error, blogposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            if(blogposts == undefined){
                return response.render("page-not-found.hbs")
            }
            const model = {
                blogposts
            }
            response.render("delete-blog.hbs", model)
        }
    })
})

app.post('/blogs-page/blog-post/:id/delete-blog', function(request, response){

    const id = request.params.id
    const yes = request.body.yes
    const no = request.body.no

    if(yes){
        const value = [id]

        const query = "DELETE FROM blogposts WHERE id = ?"

        const queryComments = "DELETE FROM comments WHERE blogID = ?"

        db.run(queryComments, value, function(error, comments){
            db.run(query, value, function(error, blogposts){
                if(error){
                    response.render("internal-server-error.hbs")
                } else {
                    response.redirect("/blogs-page")
                }
            })
        })
        
    } else if(no){
        response.redirect("/blogs-page/blog-post/" + id)
    }
    
})

//---------------------comments----------------------
app.get('/blogs-page/blog-post/:blogID/comment', function(request, response){
    
    const blogID = request.params.blogID
    let date = new Date().toLocaleDateString()

    const model = {
        blogID,
        date
    }
    response.render("write-comment.hbs", model)

})

app.post('/blogs-page/blog-post/:blogID/comment', function(request, response){
    
    const blogID = request.params.blogID
    const commentContent = request.body.comment
    const date = request.body.date

    const values = [blogID, commentContent, date]

    const query = "INSERT INTO comments(blogID, commentContent, date) VALUES(?, ?, ?)"

    let validationErrors = commentLengthValidationErrors(commentContent)

    if(validationErrors == 0){
        db.run(query, values, function(error, comments){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/blogs-page/blog-post/" + blogID)
            }
        })
    } else {
        let date = new Date().toLocaleDateString()

        const model = {
            validationErrors,
            blogID,
            date
        }
        response.render("write-comment.hbs", model)
    }
})

app.get('/blogs-page/blog-post/:blogID/edit-comment/:id', function(request, response){
    
    const id = request.params.id

    const value = [id]

    const query = "SELECT * FROM comments WHERE id = ?"

    db.get(query, value, function(error, comments){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            const model = {
                comments
            }
            response.render("edit-comment.hbs", model)
        }
    })
})

app.post('/blogs-page/blog-post/:blogID/edit-comment/:id', function(request, response){

    const id = request.params.id
    const blogID = request.params.blogID
    const commentContent = request.body.comment
    const date = new Date().toLocaleDateString()

    const values = [commentContent, date, id]

    const query = "UPDATE comments SET commentContent = ?, date = ? WHERE id = ?"

    let validationErrors = commentLengthValidationErrors(commentContent)

    if(validationErrors.length == 0){
        db.run(query, values, function(error){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect('/blogs-page/blog-post/' + blogID)
            }
        })
    } else {
        let date = new Date().toLocaleDateString()

        const model = {
            validationErrors,
            comments: {
                commentContent,
                blogID,
                date,
                id
            }
        }
        response.render("edit-comment.hbs", model)
    }
})

app.post('/blogs-page/blog-post/:blogID/delete-comment/:id', function(request, response){

    const id = request.params.id
    const blogID = request.params.blogID

    const value = [id]

    const query = "DELETE FROM comments WHERE id = ?"

    db.run(query, value, function(error, comments){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            response.redirect('/blogs-page/blog-post/' + blogID)
        }
    })
})

//---------------------project-------------------
app.get('/projects-page', function(request,response){

    const query = "SELECT * FROM projectposts"

    db.all(query, function(error, projectposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            const model = {
                projectposts
            }
            response.render("projects-page.hbs", model)
        }
    })
})

app.get('/create-project', function(request, response){

    let date = new Date().toLocaleDateString()

    const model = {
        date
    }

    response.render("create-project.hbs", model)
})

app.post('/create-project', function(request, response){

    const title = request.body.title
    const description = request.body.description
    const mainContent = request.body.mainContent
    const date = request.body.date

    const values = [title, description, mainContent, date]

    const query = "INSERT INTO projectposts(title, description, mainContent, date) VALUES(?, ?, ?, ?)"

    let validationErrors = lengthOnContentValidationErrors(title, description, mainContent)

    if(validationErrors == 0){
        db.run(query, values, function(error){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/projects-page")
            }
        })
    } else {
        const model = {
            validationErrors,
            title,
            description,
            mainContent,
            date
        }
        response.render("create-project.hbs", model)
    }
    
})

app.get('/projects-page/project-post/:id', function(request, response){

    const id = request.params.id

    const value = [id]

    const query = "SELECT * FROM projectposts WHERE id = ?"

    db.get(query, value, function(error, projectposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            if(projectposts == undefined){
                return response.render("page-not-found.hbs")
            }
            const model = {
                projectposts
            }
            response.render("project-post.hbs", model)
        }
    })
})

app.get('/projects-page/project-post/:id/edit-project', function(request, response){

    const id = request.params.id

    const value = [id]

    const query = "SELECT * FROM projectposts WHERE id = ?"

    db.get(query, value, function(error, projectposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            if(projectposts == undefined){
                return response.render("page-not-found.hbs")
            }
            const model = {
                projectposts
            }
            response.render("edit-project.hbs" ,model)
        }
    })
})

app.post('/projects-page/project-post/:id/edit-project', function(request, response){

    const id = request.params.id

    const title = request.body.title
    const description = request.body.description
    const mainContent = request.body.mainContent
    const date = request.body.date

    const values = [title, description, mainContent, date, id]

    const query = "UPDATE projectposts SET title = ?, description = ?, mainContent = ?, date = ? WHERE id = ?"

    let validationErrors = lengthOnContentValidationErrors(title, description, mainContent)

    if(validationErrors == 0){
        db.all(query, values, function(error){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/projects-page/project-post/" + id)
            }
        })
    } else {
        const model = {
            validationErrors,
            projectposts: {
                title,
                description,
                mainContent,
                date,
                id
            }
        }
        response.render("edit-project.hbs", model)
    }
    

})

app.get('/projects-page/project-post/:id/delete-project', function(request, response){
    
    const id = request.params.id

    const value = [id]

    const query = "SELECT * FROM projectposts WHERE id = ?"

    db.get(query, value, function(error, projectposts){
        if(error){
            response.render("internal-server-error.hbs")
        } else {
            const model = {
                projectposts
            }
            response.render("delete-project.hbs", model)
        }
    })
})

app.post('/projects-page/project-post/:id/delete-project', function(request, response){

    const id = request.params.id
    const yes = request.body.yes
    const no = request.body.no

    if(yes){

        const value = [id]

        const query = "DELETE FROM projectposts WHERE id = ?"

        db.run(query, value, function(error, projectposts){
            if(error){
                response.render("internal-server-error.hbs")
            } else {
                response.redirect("/projects-page")
            }
        })
    } else if(no){
        response.redirect("/projects-page/project-post/" + id)
    }

})

//---------------login------------------
app.get('/login', function(request, response){

    response.render("login.hbs", {})
})

app.post('/login', function(request, response){

    const username = request.body.username
    const password = request.body.password

    if(username == ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD)){
        request.session.isLoggedIn = true
        response.redirect("/home")
    } else {
        const model = {
            loginFailed: true,
            username
        }
        response.render("login.hbs", model)
    }
})

app.get('/logout', function(request, response){

    if(request.session.isLoggedIn){
        request.session.isLoggedIn = false
    }

    response.redirect('/home')
})

app.listen(8080)
