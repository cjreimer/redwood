export default `
import { Router, Route, Set } from '@redwoodjs/router'
import BlogLayout from 'src/layouts/BlogLayout'

const Routes = () => {
  return (
    <Router>
      <Set wrap={BlogLayout}>
        <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
        <Route path="/about" page={AboutPage} name="about" prerender/>
        <Route path="/" page={HomePage} name="home" prerender/>
      </Set>
      <Route path="/posts/new" page={PostNewPage} name="postNew" />
      <Route path="/posts/{id:Int}/edit" page={PostEditPage} name="postEdit" />
      <Route path="/posts/{id:Int}" page={PostPage} name="post" />
      <Route path="/posts" page={PostsPage} name="posts" />
      <Route notfound page={NotFoundPage} prerender/>
    </Router>
  )
}

export default Routes
`
