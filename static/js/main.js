console.log("✅ main.js is successfully loaded!");
// Organizes admin functions in a scoped object
const App = {
  admin: {}
};
/************************************************
  DOM References
************************************************/
// Global variable to store the logged-in user's ID
let currentUserId = null;
let currentUserRole = null;
let blogPosts = [];

// Nav items
const navHome = document.getElementById("navHome");
const navRegister = document.getElementById("navRegister");
const navLogin = document.getElementById("navLogin");
const navLogout = document.getElementById("navLogout");
const navPosts = document.getElementById("navPosts");
const navProfile = document.getElementById("navProfile");
const navCreatePost = document.getElementById("navCreatePost");
const navManageUsers = document.getElementById("navManageUsers");
const signUpLink = document.getElementById("signUpLink");
const signInLink = document.getElementById("signInLink");


// Grab the "Change Password" menu item
const changePasswordSection = document.getElementById("changePasswordSection");
//const changePasswordForm = document.getElementById("changePasswordForm");

const yourPostsSection = document.getElementById("yourPostsSection");
const closeEditProfile = document.getElementById("closeEditProfile");
const savedPostsSection = document.getElementById("savedPostsSection");
// Sections
const registerSection = document.getElementById("registerSection");
const loginSection = document.getElementById("loginSection");
const postsSection = document.getElementById("postsSection");
const createPostSection = document.getElementById("createPostSection");


// Forms
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const createPostForm = document.getElementById("createPostForm");
const showUpdateUsernameBtn = document.getElementById("showUpdateUsernameBtn");
const updateUsernameForm = document.getElementById("updateUsernameForm");
const cancelUpdateBtn = document.getElementById("cancelUpdateBtn");

// Output
const postsList = document.getElementById("postsGrid");

/**
 *
 * @param {string} containerId  – the ID of the <div> you just added
 * @param {"success"|"error"}  – which CSS class to use
 * @param {string} text         – the message body
 */
function showMessage(containerId, type, text) {
  const container = document.getElementById(containerId);
  if (!container) return console.warn("No container for", containerId);
  //    e.g. if type="error", you get <p class="error-message">…</p>
  container.innerHTML = `<p class="${type}-message">${text}</p>`;
  // auto-dismiss
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

/************************************************
  Hide/Show Sections
/************************************************/
//This clears the screen before showing the next section.
function hideAllSections() {
  console.log("hideAllSections() called");
  // Loops through each of these sections and adds a hidden class to hide it via CSS.
  document.querySelectorAll(".section-container, .auth-section").forEach((el) => { 
    console.log("Hiding section:", el.id);
    el.classList.add("hidden"); 
    el.style.display = "none";
    
  });
}

//Shows a specific section by its id after hiding all others
function showSection(sectionId) {
  console.log(`showSection(${sectionId}) called`);
  hideAllSections();

  const target = document.getElementById(sectionId); // selects the target section by ID
  if (target) {
    console.log(`Showing section: ${sectionId}`);
    target.classList.remove("hidden");

    // Uses "block" for admin sections, "flex" otherwise
    if (["adminUsersSection"].includes(sectionId)) {
      target.style.display = "block";
    } else {
      target.style.display = "flex";
    }
  } else {
    console.warn(`No section found with id=${sectionId}`);
  }
}
    

//On page load(display sections)
document.addEventListener("DOMContentLoaded", async () => {
  hideAllSections();  

  // Check if user is logged in
  const isLoggedIn = await checkUserStatus(); 

  if (isLoggedIn) {
    // If logged in, show blog posts by default
    applyRoleBasedUI();  
    showSection("postsSection");
    fetchPosts();
  } else {
    // If NOT logged in, show the home page
    showSection("homeSection");
  }
});


// Selects all HTML elements that have the attribute data-role (delete btn etc..)
function applyRoleBasedUI() {
  if (!currentUserRole) return;
  document.querySelectorAll("[data-role]").forEach(el => {
    const roles = el.dataset.role.split(" ");
    el.hidden = !roles.includes(currentUserRole); // If the current user's role is not included in the element’s allowed roles, it sets that ele hidden
  });
}


/************************************************
  Navigation Events
************************************************/
navHome.addEventListener("click", () => {
  showSection("homeSection");
});

console.log("🔍 navRegister:", navRegister);
console.log("🔍 navLogin:   ", navLogin);
//user registration click
console.log("➤ Attaching register listener");
navRegister.addEventListener("click", (e) => {
  console.log("🖱️ navRegister clicked – target:", e.target);
  showSection("registerSection");
});
//login click
console.log("➤ Attaching login listener");
navLogin.addEventListener("click", (e) => {
  console.log("🖱️ navLogin clicked – target:", e.target);
  showSection("loginSection");
});

//create post click
navCreatePost.addEventListener("click", () => {
  console.log("🛠️ Create Post NAV button clicked!");
  showSection("createPostSection");
});

//Blog posts click
navPosts.addEventListener("click", () => {
  console.log("🛠️ Blog Posts button clicked!");
  showSection("postsSection");
  fetchPosts();
});

navProfile.addEventListener("click", async() => { // await the new user, then reload
  showSection("profileSection");
  await checkUserStatus();
  await fetchProfileInfo(); // ✅ Load profile data
  fetchProfileForEdit();
  loadUserPosts();
  loadSavedPosts();
});

signUpLink.addEventListener("click", (e) => {
  e.preventDefault(); // prevent navigating 
  hideAllSections();
  showSection("registerSection"); // or however you display Register
});

signInLink.addEventListener("click", (e) => {
  e.preventDefault();
  hideAllSections();
  showSection("loginSection");    // or however you display Login
});

/************************************************
  Check User Authentication Status
************************************************/
// decides what section to show(login, reg) or logout, blogpost, profile
async function checkUserStatus() {
  console.log("checkUserStatus() called");
  try {
    const response = await fetch("/me", {
      method: "GET",
      credentials: "include",
    });

    console.log("checkUserStatus() /me response:", response.status);

    if (!response.ok) {
      throw new Error("Not authenticated");
    }
    // The /me response should now have {"id": ..., "username": ...}
    
    const data = await response.json();
    console.log("✅ Logged in as:", data);

    currentUserId   = data.id;     // Store user ID globally
    currentUserRole = data.role;   // <-- NEW: store role
    console.log("✅ Current User:", currentUserId, "role=", currentUserRole);
    // If response is OK, user is logged in
    
    // Hide "Register" and "Login"
    navRegister.classList.add("hidden");
    navLogin.classList.add("hidden");

    // Show "Logout", "Blog Posts", "Create Post"
    navLogout.classList.remove("hidden");
    navPosts.classList.remove("hidden");
    navCreatePost.classList.remove("hidden");
    navProfile.classList.remove("hidden");
    
    //  Admin-only link
    if (currentUserRole === "admin") {
      navManageUsers.classList.remove("hidden");
    } else {
      navManageUsers.classList.add("hidden");
    }

    return true; // ✅ user is logged in
  } catch (error) {
    console.log("Not authenticated:", error.message);

    // Show "Register", "Login"
    navRegister.classList.remove("hidden");
    navLogin.classList.remove("hidden");

    // Hide "Logout", "Blog Posts", "Create Post"
    navLogout.classList.add("hidden");
    navPosts.classList.add("hidden");
    navCreatePost.classList.add("hidden");
    navProfile.classList.add("hidden");
    navManageUsers.classList.add("hidden"); 

    return false; // ❌ user not logged in
  }
}


/************************************************
  Logout click
************************************************/
navLogout.addEventListener("click", async () => {
  
  try {
    // 2. Call logout endpoint
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      return;
    }


    // 3. Refresh your user‐status UI logic
    await checkUserStatus();

    // 4. Also clear any hidden attribute on the <li> wrappers so they show immediately
    document.getElementById("navLogin").parentElement.hidden    = false;
    document.getElementById("navRegister").parentElement.hidden = false;

    // 5. Manually re‐toggle the classes for guest/auth links
    //    (checkUserStatus already toggled these, but we double‐ensure here)
    navRegister.classList.remove("hidden");
    navLogin    .classList.remove("hidden");

    navLogout      .classList.add("hidden");
    navPosts       .classList.add("hidden");
    navCreatePost  .classList.add("hidden");
    navProfile     .classList.add("hidden");
    // reset the global so no one can accidentally write into the old user’s bucket
  currentUserId = null;
    navManageUsers .classList.add("hidden");

    // 6. Send them back to Home
    hideAllSections();
    showSection("homeSection");
  } catch (error) {
    alert("Error during logout");
  }
});


/************************************************
  Register form for user
************************************************/
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value;
  const password = document.getElementById("regPassword").value;
  const email = document.getElementById("regEmail").value;

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" }, //It sends the title and content as JSON
      credentials: "include",
      body: JSON.stringify({ username, email, password}),
    });

    const data = await response.json();
    console.log("Server response:", data);
    if (!response.ok) {
      showMessage("registerMessage", "error", data.detail || data.message);
    } else {
      showMessage("registerMessage", "success", data.message);
      registerForm.reset();      // optional: clear fields
    }
  } catch (error) {
    showMessage("registerMessage", "error", "Network error – please try again");
  }
});

/************************************************
  Loginform User
************************************************/
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();  // prevent default HTML form reload

  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  // 2) Build a URL-encoded body, FastAPI's OAuth2PasswordRequestForm expects data in this format.
  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  try {
    // 3) POST as x-www-form-urlencoded
    const response = await fetch("/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", //The body is URL-encoded  which matches what OAuth2PasswordRequestForm expects.
      },
      body: body.toString(),
    });

    const data = await response.json();  //converts server response to json
    console.log("Login response:", response.status, data);
    if (response.ok) {
      showMessage("loginMessage", "success", data.message);

      // 1) Update UI for logged-in user
      await checkUserStatus();
      applyRoleBasedUI();    

      // 2) Immediately hide all sections
      hideAllSections(); 

      // 3) Show your default section after login ,
      showSection("postsSection"); 
      fetchPosts(); 

    } else {
      showMessage("loginMessage", "error", data.detail || data.message);
    }
  } catch (error) {
    showMessage("loginMessage", "error", "Network error – please try again");
  }
});

/************************************************
  Create Post (Form Submit)
************************************************/
createPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("🛠️ Create Post button clicked!");

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const category = document.getElementById("postCategory").value.trim();

  if (!title || !content) {
    showMessage("createPostMessage", "error", "⚠️ Title and content cannot be empty!");
    return;
  }

  console.log("📌 Sending request to create post with:", { title, content, category});

  try {
    const response = await fetch("/blog_posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },//It sends the title and content as JSON
      credentials: "include",
      body: JSON.stringify({ title, content, category}), //sends the actual data.
    });

    const data = await response.json();
    console.log("🛠️ Create Post Response:", response.status, data);

    if (response.ok) {
      showMessage("createPostMessage", "success", "✅ Post created successfully!");
      document.getElementById("postTitle").value = ""; // reset the form
      document.getElementById("postContent").value = "";

      // Refresh posts section with added post
      fetchPosts();
    } else {
      showMessage("createPostMessage", "error", data.detail || "❌ Error creating post");

    }
  } catch (error) {
    showMessage("createPostMessage", "error", "❌ Error creating post: " + error.message);
  }
});



/************************************************
  Attach Edit/Delete Buttons to Posts
************************************************/
function attachPostButtonListeners() {
  console.log("🛠️ Attaching event listeners for Edit and Delete buttons...");

  document.querySelectorAll(".edit-btn").forEach((button) => { // for each edit button attach listner
    button.addEventListener("click", (e) => {
      const postId = e.target.dataset.id; //postId is taken from the button's data-id attribute.
      const title = decodeURIComponent(e.target.dataset.title);
      const content = decodeURIComponent(e.target.dataset.content);
      editPost(postId, title, content); // calls the editPost function, passing details
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const postId = e.target.dataset.id;
      deletePost(postId);
    });
  });
}




/************************************************
  Fetch Blog Posts
************************************************/
async function fetchPosts() {
  console.log("🛠️ Fetching blog posts...");

  // Helper to truncate text
  function getTruncatedContent(fullText, limit = 15) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "..."; //If the content is longer, it takes first 15 and join them into single str and adds "..." and says it's truncated.
    return { shortText: truncated, isTruncated: true };
  }

  try {
    // Check if user is logged in
    const userResponse = await fetch("/me", { credentials: "include" });
    if (!userResponse.ok) {
      throw new Error("⚠️ Failed to get user info. Please log in again.");
    }
    const userData = await userResponse.json();
    const {id: currentUserId, role: currentUserRole } = userData; //If it succeeds, gets the logged-in user's id

    // Fetch all blog posts from server
    const response = await fetch("/blog_posts", {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) {
      const errData = await response.json();
      return showMessage("postsMessage", "error", errData.detail || "Error fetching posts");
    }
    const posts = await response.json();
    blogPosts = posts;      //After loading /blog_posts, assigned posts to blogposts

    console.log("📜 Fetched Posts:", posts);

    // Clear existing grid
    const grid = document.getElementById("postsGrid");
    if (!grid) {
      console.error("❌ #postsGrid not found in DOM!");
      return;
    }
    grid.innerHTML = "";
    document.getElementById("postsMessage").innerHTML = ""; // clear any prior msg

    let hasVisiblePosts = false;

    posts.forEach((post, i) => {
      // skip user's own posts, if not admin
      if (post.user_id === currentUserId && currentUserRole === "user") {
        return;
      }
      hasVisiblePosts = true;     // helps decide if a message like "No posts found" should be shown or not

      // fallback for title/content, Handle missing data safely
      const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled";
      const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
      const username = (post.username && post.username !== "undefined") ? post.username : "Unknown User";
      const postCategory = (post.category && post.category !== "undefined") ? post.category : "general";

      // truncate
      const { shortText, isTruncated } = getTruncatedContent(postContent, 15); 

      //condition to enable delete button
      const canDelete =
        currentUserRole === "admin" ||
        (currentUserRole === "user" && post.user_id === currentUserId);

      //Create a blog card
      const card = document.createElement("div");
      card.classList.add("blog-card");
      card.style.position = "relative"; // Ensure the card is relative for absolute positioning


      // 1) Convert the ISO string to a JS Date, then format to just the date part:
      const createdAt = new Date(post.created_at);
      const formattedDate = createdAt.toLocaleDateString(); 

      // insert HTML, Header: Username and Date
      card.innerHTML = `
        <div class="card-header">      
          <span class="username" data-user-id="${post.user_id}">@${username}</span>
          <span class="post-date"> ${formattedDate}</span>
        </div>
      
        <h3 class="post-title">${postTitle}<span class="post-category-small">(${postCategory})</span>
        </h3>
        <p class="post-content">${shortText}</p>
        ${
          isTruncated
            ? `<a href="#" class="read-more" data-post-index="${i}">Read more</a>` //Tagged each “Read more” link with an index
            : ""
        }

        ${canDelete
          ? `<button class="delete-btn" data-id="${post._id}">Delete</button>`
          : ""
        }

        <!-- The bookmark icon in bottom-right corner -->
        <i 
          class="bi bi-bookmark bookmark-icon"
          data-id="${post._id}"
          data-title="${postTitle}"
          data-content="${postContent}"
          data-username="${username}"
          style="cursor: pointer;"
        ></i>
      `;
        
      //data-id holds the post's ID to identify which post to delete on click.

      // append to the grid
      grid.appendChild(card);

      attachPostButtonListeners();
    });
    

    // 🔹 After creating all cards, attach the .bookmark-icon listeners:(button for saving posts)
    document.querySelectorAll(".bookmark-icon").forEach(icon => {
      icon.addEventListener("click", function() {
        const postId = this.dataset.id;
        const postTitle = this.dataset.title;
        const postContent = this.dataset.content;
        const userName = this.dataset.username;

        const key = getSavedKey(); // ← use per-user key
        let savedPosts = JSON.parse(localStorage.getItem(key)) || [];

        // Check if already saved
        const alreadySaved = savedPosts.some(sp => sp.id === postId);
        if (alreadySaved) {
          return showMessage("postsMessage", "error", "This Post is already saved!");
          
        }

        // Push post data (including username) into localStorage
        savedPosts.push({ 
          id: postId, 
          title: postTitle, 
          content: postContent, 
          username: userName
        });
        localStorage.setItem(key, JSON.stringify(savedPosts));

        showMessage("postsMessage", "success", "✅ Post saved successfully");

        loadSavedPosts();
      });
    });

    // ─── listens for click on “Read more”, → opens our Bootstrap modal ──────────────────────
    document
      .getElementById("postsGrid")
      .addEventListener("click", (e) => {
        if (!e.target.classList.contains("read-more")) return;
        e.preventDefault();

        //Retrieve the full post object
        const idx = Number(e.target.dataset.postIndex);
        const post = blogPosts[idx];
        if (!post) return;

        // fill in the modal
        document.getElementById("postModalLabel").textContent = post.title;
        document.getElementById("postModalBody").textContent = post.content;
        document.getElementById("postModalMeta").textContent = [
          `@${post.username}`,
          new Date(post.created_at).toLocaleDateString(),
          post.category ? `(${post.category})` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        // show modal on screen
        new bootstrap.Modal(      //bootstrap api that handles show/hide, backdrop, focus trapping, and animations for you.
          document.getElementById("postModal")
        ).show();
      })

  
    // 7) If no posts were visible, show a “No blog posts available” message
    if (!hasVisiblePosts) {
      grid.innerHTML = '<p style="color: red; font-weight: bold;">No blog posts available.</p>';
    }

    // Search/filter logic
    const searchBar = document.getElementById("blogSearchBar");
    const searchBtn = document.getElementById("blogSearchBtn");
    if (searchBar) {
      searchBar.addEventListener("keyup", function () {
        const query = this.value.toLowerCase();

        // For each .blog-card, check if title text includes query
        document.querySelectorAll(".blog-card").forEach((card) => {
          const titleEl = card.querySelector(".post-title");
          const catEl = card.querySelector(".post-category");

          const titleText = titleEl ? titleEl.textContent.toLowerCase() : "";
          const catText = catEl ? catEl.textContent.toLowerCase() : "";

          // If query is found in the title, show; otherwise hide
          if (titleText.includes(query)||catText.includes(query)) {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        });
      });
    }

  } catch (error) {
    console.error("fetchPosts error:", error);
    showMessage(
      "postsMessage",
        "error",
        "❌ Unable to load posts: " + (error.message || error)
      );
  }
}


/************************************************
  Edit & Delete Posts
************************************************/
async function editPost(id, title, content) {
  const newTitle = prompt("✏️ Update Title:", title);
  if (newTitle === null) return;

  const newContent = prompt("📝 Update Content:", content);
  if (newContent === null) return;

  const formData = new FormData();
  formData.append("title", newTitle);
  formData.append("content", newContent);

  try {
    const response = await fetch(`/blog_posts/${id}`, {
      method: "PUT",
      credentials: "include",
      body: formData,
    });

    if (response.ok) {
      showMessage("userPostsMessage","success", "✅ Post updated Succesfully!");  
      fetchPosts();
    } else {
      const errorData = await response.json();
      showMessage(
        "userPostsMessage",
        "error",
        errorData.detail || "❌ Error updating post"
      );
      
    }
  } catch (error) {
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Network error — could not update profile: " + err.message
    );
  }
}

async function deletePost(id) {
  // if (!confirm("🗑️ Are you sure you want to delete this post?")) return;

  try {
    const response = await fetch(`/blog_posts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      showMessage(
        "userPostsMessage",
        "success",
        "✅ Blog post deleted successfully!"
      );
      fetchPosts();
    } else {
      const errorData = await response.json();
      showMessage(
        "userPostsMessage",
        "error",
        errorData.detail || "❌ Error deleting post"
      );
    }
  } catch (error) {
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Error deleting post: " + error.message
    );
    
  }
}



function getSavedKey() {
  if (!currentUserId) {
    console.error("🚨 getSavedKey(): no currentUserId!");
    throw new Error("You must be logged in to save posts");
  }
  const key = `savedPosts_${currentUserId}`;
  console.log("🔑 getSavedKey() →", key);
  return key;
}
//To get user profileInfo
function loadSavedPosts() {

  const savedPostsGrid = document.getElementById("savedPostsGrid");
  if (!savedPostsGrid) return;

  savedPostsGrid.innerHTML = ""; // Clear old posts

  // 1) Retrieve from localStorage using per-user key
  const key = getSavedKey();
  const savedPosts = JSON.parse(localStorage.getItem(key)) || []
  
  console.log("Loading saved posts for user:", currentUserId);
  console.log("Found this array:", savedPosts);

  // 2) If no saved, show message
  if (savedPosts.length === 0) {
    savedPostsGrid.innerHTML = '<p class="no-posts-message">No posts are saved.</p>';
    return;
  }
  
  // 3) Helper to truncate text (similar to your fetchPosts code)
  function getTruncatedContent(fullText, limit = 15) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "...";
    return { shortText: truncated, isTruncated: true };
  }

  // 4) Build a card for each saved post
  savedPosts.forEach((post, index) => {
    // fallback for title/content/username
    const postTitle = (post.title && post.title !== "undefined") ? post.title : "Untitled";
    const postContent = (post.content && post.content !== "undefined") ? post.content : "No content provided";
    const username = (post.username && post.username !== "undefined") ? post.username : "Unknown User";
  
    // truncate if needed
    const { shortText, isTruncated } = getTruncatedContent(postContent, 15);

    // create a card div
    const card = document.createElement("div");
    card.classList.add("blog-card"); // same class as your main posts

    card.innerHTML = `
      <span class="username">@${username}</span>
      <h3 class="post-title">${postTitle}</h3>
      <p class="post-content">${shortText}</p>
      ${
        isTruncated
          ? `<a href="#" class="read-more">Read more</a>`
          : ""
      }
      <button 
        class="btn btn-sm btn-danger unsave-btn" 
        data-index="${index}"
      >
        Unsave
      </button>
    `;

    // append card to savedPostsGrid
    savedPostsGrid.appendChild(card);

    // read more logic
    if (isTruncated) {
      const readMoreLink = card.querySelector(".read-more");
      let isExpanded = false;

      readMoreLink.addEventListener("click", (e) => {
        e.preventDefault();
        isExpanded = !isExpanded;

        const contentEl = card.querySelector(".post-content");
        if (isExpanded) {
          contentEl.textContent = postContent;
          readMoreLink.textContent = "Show less";
        } else {
          contentEl.textContent = shortText;
          readMoreLink.textContent = "Read more";
        }
      });
    }
  });
 // 🔹 Attach Unsave logic after creating all cards
 document.querySelectorAll(".unsave-btn").forEach(button => { //Find all buttons with the class .unsave-btn
  button.addEventListener("click", function() {        //Add a click event listener to each button:
    const index = parseInt(this.dataset.index, 10); 
    removeSavedPost(index);
  });
});
}

// to remove posts from saved
function removeSavedPost(index) {
  const key = getSavedKey();
  let savedPosts = JSON.parse(localStorage.getItem(key)) || [];
  if (index >= 0 && index < savedPosts.length) {
    // Remove the post at this index
    savedPosts.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(savedPosts));
    // Re-load the saved posts to reflect changes
    loadSavedPosts();
  }
}


// Helper Function to truncate text
  function getTruncatedContent(fullText, limit = 10) {
    const words = fullText.split(" ");
    if (words.length <= limit) {
      return { shortText: fullText, isTruncated: false };
    }
    const truncated = words.slice(0, limit).join(" ") + "...";
    return { shortText: truncated, isTruncated: true };
  }



async function loadUserPosts() {
  try {
    // 1) Fetch profile data to get user posts
    const response = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    if (!response.ok) {
      const errData = await response.json();
      return showMessage(
        "userPostsMessage",
        "error",
        errData.detail || "Error fetching profile for user posts"
      );
      
    }

    const data = await response.json();
    console.log("Profile data (for user posts):", data);

    // 2) Grab the container where we display user posts
    const userPostsList = document.getElementById("userPostsList");
    if (!userPostsList) {
      console.error("No #userPostsList element found!");
      return;
    }
    userPostsList.innerHTML = ""; // Clear old posts

    // 3) If user has no posts, display a message
    if (!data.posts || data.posts.length === 0) {
      userPostsList.innerHTML = "<li class='list-group-item'>No posts yet.</li>";
      return;
    }

    // 4) Helper to truncate text (same as your original logic)
    function getTruncatedContent(fullText, limit = 10) {
      const words = fullText.split(" ");
      if (words.length <= limit) {
        return { shortText: fullText, isTruncated: false };
      }
      const truncated = words.slice(0, limit).join(" ") + "...";
      return { shortText: truncated, isTruncated: true };
    }

    // 5) Render each user post into #userPostsList
    data.posts.forEach((post) => {
      const postTitle = post.title ? post.title : "Untitled";
      const postContent = post.content ? post.content : "No content provided";

      // Encoded for safe passing in data attributes (if needed for editing)
      const encodedTitle = encodeURIComponent(postTitle);
      const encodedContent = encodeURIComponent(postContent);

      const { shortText, isTruncated } = getTruncatedContent(postContent, 10);

      // Create a list item with a small layout for Edit/Delete
      const listItem = document.createElement("li");
      listItem.classList.add(
        "list-group-item", 
        "d-flex", 
        "justify-content-between", 
        "align-items-start"
      );

      // Construct the inner HTML
      listItem.innerHTML = `
        <div class="flex-grow-1">
          <strong class="mb-1 d-block">${postTitle}</strong>
          <p class="post-text mb-1">${shortText}</p>
          ${
            isTruncated
              ? `<a href="#" class="read-more" style="color: #1565c0;">Read more</a>`
              : ""
          }
        </div>
        <div>
          <button 
            class="btn btn-sm btn-secondary edit-btn" 
            data-id="${post.id}"
            data-title="${encodedTitle}"
            data-content="${encodedContent}"
          >
            Edit
          </button>
          <button 
            class="btn btn-sm btn-danger delete-btn" 
            data-id="${post.id}"
          >
            Delete
          </button>
        </div>
      `;

      userPostsList.appendChild(listItem);

      // 6) "Read more" toggle logic
      if (isTruncated) {
        const readMoreLink = listItem.querySelector(".read-more");
        readMoreLink.addEventListener("click", (e) => {
          e.preventDefault();
          const postText = listItem.querySelector(".post-text");
          const isExpanded = readMoreLink.textContent === "Show less";

          if (isExpanded) {
            postText.textContent = shortText;
            readMoreLink.textContent = "Read more";
          } else {
            postText.textContent = postContent; // Show full content
            readMoreLink.textContent = "Show less";
          }
        });
      }
    });

    // 7) Finally, attach your Edit/Delete button listeners
    attachPostButtonListeners();
    
  } catch (error) {
    console.error("Error loading user posts:", error);
    showMessage(
      "userPostsMessage",
      "error",
      "❌ Error loading your posts: " + (error.message || error)
    );
  }
}




async function fetchProfileInfo() {
  try {
    const response = await fetch("/profile", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      const errData = await response.json();
      return showMessage(
        "profileMessage",
        "error",
        errData.detail || "Error fetching profile"
      );
    }

    const data = await response.json();
    console.log("Profile data:", data);
    // Now we display 'name' in the big bold spot
    document.getElementById("profileName").textContent = data.name || "No name set";

    // If there's a photo URL, display it
    if (data.photo_url) {
      document.getElementById("profilePic").src = data.photo_url;
    }

    // Fill the basic profile info
    const profileInfo = document.getElementById("profileInfo");
    profileInfo.innerHTML = `
      <p><strong>Username:</strong> ${data.username}</p>
      <p><strong>Total Posts:</strong> ${data.total_posts}</p>
      <hr>
      <!-- We create a placeholder for 'Your Posts' but we won't render them here -->
    `;

    // Done! We no longer auto-render data.posts in this function.
    // If you want to actually populate #userPostsList, do it in a separate function 
    // e.g. loadUserPosts() that fetches or uses the same data.

  } catch (error) {
    showMessage(
      "profileMessage",
      "error",
      "Error fetching profile info: " + error.message
    );
  }
}




// 1) Listen for camera icon click to open file picker
const cameraIcon = document.getElementById("cameraIcon");
const uploadProfilePic = document.getElementById("uploadProfilePic");
const cameraMenu = document.getElementById("cameraMenu");
const choosePhoto = document.getElementById("choosePhoto");
const removePhoto = document.getElementById("removePhoto");
const profilePic = document.getElementById("profilePic");


// 1) Toggle dropdown on camera icon click
if (cameraIcon && cameraMenu) {
  cameraIcon.addEventListener("click", () => {
    console.log("✅ cameraIcon was clicked!");
    cameraMenu.classList.toggle("show");
  });
}

// 2) "Choose from system" triggers file input
if (choosePhoto && uploadProfilePic) {
  choosePhoto.addEventListener("click", () => {
    // Hide the menu
    cameraMenu.classList.remove("show")
    // Trigger file input
    uploadProfilePic.click();
  });
}

// 3) On file selection, do your usual upload logic
if (uploadProfilePic) {
  uploadProfilePic.addEventListener("change", async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/upload_profile_photo", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage(
          "profileMessage",
          "error",
          data.detail || "Error uploading photo"
        );
      }

      const data = await response.json();
      // Update the src of #profilePic
      profilePic.src = data.photo_url;
      showMessage(
        "profileMessage",
        "success",
        "✅ Profile photo updated successfully!"
      );
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Upload error:", err);
      showMessage(
        "profileMessage",
        "error",
        "Error uploading photo: " + err.message
      );
    }
  });
}

// 4) "Remove photo" calls a remove endpoint
if (removePhoto) {
  removePhoto.addEventListener("click", async () => {
    // Hide the menu
    cameraMenu.classList.add("hidden");

    // Confirm user wants to remove
    if (!confirm("Remove your profile photo?")) return;

    try {
      const response = await fetch("/remove_profile_photo", {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const errData = await response.json();
        return showMessage(
          "profileMessage",
          "error",
          data.detail || "Error removing photo"
        );
      }

      // On success, revert #profilePic to default icon
      profilePic.src = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgNTEyIDUxMiIgZmlsbD0iI2NjYyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjU2IDI1NmM3MC43IDAgMTI4LTU3LjMxIDEyOC0xMjhTMzI2LjcgMCAyNTYgMFMxMjggNTcuMzEgMTI4IDEyOFMxODUuMyAyNTYgMjU2IDI1NnogTTI1NiAyODhDMTU4LjggMjg4IDAgMzM4LjggMCA0NDh2NjRoNTEyVjQ0OEM1MTIgMzM4LjggMzUzLjIgMjg4IDI1NiAyODh6Ii8+PC9zdmc+";

      showMessage(
        "profileMessage",
        "success",
        "✅ Profile photo removed successfully!"
      );

    } catch (err) {
      console.error(err);
      showMessage(
        "profileMessage",
        "error",
        "Error removing photo: " + err.message
      );
    }
  });
}

// c) Tab behavior
  const tabButtons = document.querySelectorAll(".profile-tabs .tab-button");
  const tabPanels  = document.querySelectorAll(".tab-panel");

  // 1) No button starts active
  tabButtons.forEach(b => b.classList.remove("active"));
  // All panels start hidden
  tabPanels.forEach(p => p.classList.add("hidden"));

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const panel   = document.getElementById(targetId);
      const isOpen  = btn.classList.contains("active");

      // 2) If already open, just close it
      if (isOpen) {
        btn.classList.remove("active");
        panel.classList.add("hidden");
        return;
      }
      // 3) Otherwise, close everything…
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.add("hidden"));
      // 4) …then open this one
      btn.classList.add("active");
      panel.classList.remove("hidden");
      // show/hide panels
      // Load content for this tab:
      if (targetId === "yourPostsPanel") {
        loadUserPosts();
      } else if (targetId === "savedPostsPanel") {
        loadSavedPosts();
      } else if (targetId === "editProfilePanel") {
      // Re-load this user’s profile into the edit form every time
      fetchProfileForEdit();
      }
      // changePasswordPanel has no preload
    });
});

//EDIT PROFILE HANDLER
// 1) Fetch current profile & pre-fill the form
async function fetchProfileForEdit() {
  try {
    const res = await fetch("/profile", {
      method: "GET",
      credentials: "include"
    });
    if (!res.ok) {
      const err = await res.json();
      return showMessage(
        "editProfileMessage",
        "error",
        err.detail || "Error fetching profile details"
      );
    }
    const data = await res.json();
    // Helper to apply faded style
    function applyFetched(inputId, value) {
      const input = document.getElementById(inputId);
      if (!input || !value) return;
      input.value = value;
      input.classList.add("fetched-value");
      // On first user edit, remove the faded style
      input.addEventListener("input", () => {
        input.classList.remove("fetched-value");
      }, { once: true });
    }

    applyFetched("newName",     data.name);
    applyFetched("newUsername", data.username);
    applyFetched("newEmail",    data.email);

  } catch (err) {
    console.error("fetchProfileForEdit:", err);
     showMessage(
      "editProfileMessage",
      "error",
      "Error fetching profile: " + err.message
    );
  }
}


// 2) “Save Changes” button handler
const saveProfileBtn = document.getElementById("saveProfileBtn");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    // Grab & trim values
    const nameEl     = document.getElementById("newName");
    const userEl     = document.getElementById("newUsername");
    const emailEl    = document.getElementById("newEmail");
    const newName     = nameEl    ? nameEl.value.trim()     : "";
    const newUsername = userEl    ? userEl.value.trim()     : "";
    const newEmail    = emailEl   ? emailEl.value.trim()    : "";

    // Build FormData with only non-empty fields
    const fd = new FormData();
    if (newName)     fd.append("new_name",      newName);
    if (newUsername) fd.append("new_username",  newUsername);
    if (newEmail)    fd.append("new_email",     newEmail);

    try {
      const res = await fetch("/edit_profile", {
        method: "PUT",
        credentials: "include",
        body: fd
      });
      const result = await res.json();
      if (!res.ok) {
        return showMessage(
          "editProfileMessage",
          "error",
          result.detail || "Error editing profile"
        );
      }

      showMessage(
        "editProfileMessage",
        "success",
        result.message || "✅ Profile updated successfully!"
      );
      // 2) Close the Edit Profile panel
      const editBtn   = document.querySelector('.tab-button[data-target="editProfilePanel"]');
      const editPanel = document.getElementById('editProfilePanel');
      if (editBtn && editPanel) {
        editBtn.classList.remove('active');
        editPanel.classList.add('hidden');
      }

      // 5) (Optional) Re-fetch to update header/info
      await fetchProfileForEdit();

    } catch (err) {
      console.error("Error editing profile:", err);
      showMessage(
        "editProfileMessage",
        "error",
        "Error editing profile: " + err.message
      );
    }
  });
}



// ─── Change Password submission Handler ───
;(function(){
  const savePasswordBtn   = document.getElementById("savePasswordBtn");
  const form = document.getElementById("changePasswordForm");
  if (!savePasswordBtn || !changePasswordForm) return;

  savePasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // stop the native form submission

    const oldPwd     = document.getElementById("oldPassword")?.value.trim()     || "";
    const newPwd     = document.getElementById("newPassword")?.value.trim()     || "";
    const confirmPwd = document.getElementById("confirmPassword")?.value.trim() || "";

    // 1) Basic validation
    if (!oldPwd || !newPwd || !confirmPwd) {
      return showMessage("changePasswordMessage", "error", "Please fill out all fields");
    }
    if (newPwd !== confirmPwd) {
      return showMessage(
        "changePasswordMessage",
        "error",
        "❌ New passwords do not match"
      );
    }

    // 2) Build the payload
    const fd = new FormData();
    fd.append("current_password", oldPwd);
    fd.append("new_password",     newPwd);

    try {
      // 3) Send to your FastAPI endpoint
      const res  = await fetch("/change_password", {
        method: "PUT",
        credentials: "include",
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error changing password");

      // 4) Success
      showMessage(
        "changePasswordMessage",
        "success",
        data.message || "✅ Password updated successfully!"
      );

      // 5) Collapse the Change Password tab
      const btn   = document.querySelector('.tab-button[data-target="changePasswordPanel"]');
      const panel = document.getElementById("changePasswordPanel");
      if (btn && panel) {
        btn.classList.remove("active");
        panel.classList.add("hidden");
      }
    } catch (err) {
      console.error("Change password failed:", err);
      showMessage(
        "changePasswordMessage",
        "error",
        "❌ Network error: " + err.message
      );
    }
  });
})();





// NAV ITEMS FOR ADMIN SECTIONS
//console.log("⏳ Adding click listener to navManageUsers");
//const navManageUsers = document.getElementById("navManageUsers");
console.log("navManageUsers element is:", navManageUsers);
if (navManageUsers) {
  navManageUsers.addEventListener("click", () => {
    console.log("🖱️ Manage Users clicked");
    hideAllSections();
    showSection("adminUsersSection");
    App.admin.loadUsers();
  });
}
else {
  console.warn("⚠️ navManageUsers not found in DOM!");
}


// ───────────────────────────────────────────────────────────────────────────
// Admin: Manage Users logic
// ───────────────────────────────────────────────────────────────────────────
App.admin.loadUsers = async () => {
  console.log("📥 Admin user loader called!");
  try {
    const res = await fetch('/admin/users', { credentials: 'include' });
    const users = await res.json();
    const tbody = document.querySelector('#adminUsersSection #adminUsersTable tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="color:red;">⚠️ JavaScript ran but table failed to populate</td></tr>';
    tbody.innerHTML = '';
    users.forEach(u => {
      console.log("Rendering user:", u.username);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td><span class="username-cell" data-id="${u.id}">${u.username}</span></td>
        <td>${u.email || ''}</td>
        <td>${u.role}</td>
        <td>
          ${u.role === 'user'
            ? `<button data-action="promote" data-id="${u.id}">Promote</button>`
            : `<button data-action="demote" data-id="${u.id}">Demote</button>`
          }
          <button data-action="delete-user" data-id="${u.id}">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Failed to load users: " + e.message);
  }
};

App.admin.filterUsers = () => {
  const term = document.getElementById('userSearchInput').value.toLowerCase();
  document.querySelectorAll('#adminUsersTable tbody tr').forEach(tr => {
    const txt = tr.innerText.toLowerCase();
    tr.hidden = !txt.includes(term);
  });
};

App.admin.openUserModal = async (userId) => {
  try {
    const res = await fetch(`/admin/users/${userId}`, { credentials: 'include' });
    const u = await res.json();
    document.getElementById('modalUsername').innerText   = u.username;
    document.getElementById('modalEmail').innerText      = u.email || '—';
    document.getElementById('modalPostCount').innerText  = u.total_posts;
    document.getElementById('userDetailModal').classList.remove('hidden');
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Failed to load user details: " + e.message);
  }
  
};

App.admin.closeUserModal = () => {
  document.getElementById('userDetailModal').classList.add('hidden');
};


App.admin.handleUserActions = async (evt) => {
  const btn = evt.target;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;
  if (!action) return;

  try {
    let res;
    switch(action) {
      case 'promote':
        res = await fetch(`/admin/users/${id}/promote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'demote':
        res = await fetch(`/admin/users/${id}/demote`, {
          method: 'PUT', credentials: 'include'
        });
        break;
      case 'delete-user':
        res = await fetch(`/admin/users/${id}`, {
          method: 'DELETE', credentials: 'include'
        });
        break;
    }
    if (!res.ok){
      const err = await res.text();
      return showMessage("adminMessage", "error", "Action failed: " + err);
    }
    showMessage("adminMessage", "success", "Action succeeded");
    // reload the table after change
    App.admin.loadUsers();
  } catch (e) {
    console.error(e);
    showMessage("adminMessage", "error", "Action failed: " + e.message);
  }
};

// Delegate clicks for promote/delete and username clicks
document.addEventListener('click', (evt) => {
  if (evt.target.matches('button[data-action]')) {
    App.admin.handleUserActions(evt);
  } else if (evt.target.matches('.username-cell')) {
    App.admin.openUserModal(evt.target.dataset.id);
  }
});



