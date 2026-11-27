import { supabase } from "../supabase/supabase.js";

const totalProjects = document.getElementById("totalProjects");
const graphicProjects = document.getElementById("graphicProjects");
const videoProjects = document.getElementById("videoProjects");
const adminProjectList = document.getElementById("adminProjectList");
const logoutButton = document.getElementById("logoutButton");

// 1. CHECK AUTHENTICATION

async function checkAuthentication() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "/admin.html";
    return false;
  }

  console.log("Dashboard user:", data.user.email);

  return true;
}

// 2. LOAD PROJECTS

async function loadDashboard() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Dashboard error:", error.message);
    adminProjectList.textContent = "Unable to load projects.";
    return;
  }
  // 3. ADD NEW PROJECT

  const projectForm = document.getElementById("projectForm");
  const saveProjectButton = document.getElementById("saveProjectButton");
  const projectMessage = document.getElementById("projectMessage");

  projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("projectTitle").value.trim();
    const category = document.getElementById("projectCategory").value;
    const description = document
      .getElementById("projectDescription")
      .value.trim();
    const imageFile = document.getElementById("projectImage").files[0];
    const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
    const orientation = document.getElementById("videoOrientation").value;

    if (!imageFile) {
      projectMessage.textContent = "Please select a project thumbnail.";
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      projectMessage.textContent = "Image must be smaller than 5 MB.";
      return;
    }

    saveProjectButton.disabled = true;
    saveProjectButton.textContent = "Uploading...";
    projectMessage.textContent = "";

    let uploadedFilePath = null;

    try {
      // Upload image to Supabase Storage

      const fileExtension = imageFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;

      uploadedFilePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public image URL

      const { data: imageData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      const imageUrl = imageData.publicUrl;

      // Save project in database

      saveProjectButton.textContent = "Saving Project...";

      const { error: insertError } = await supabase.from("projects").insert({
        title: title,
        category: category,
        description: description,
        image_url: imageUrl,
        youtube_url: youtubeUrl || null,
        video_orientation: orientation,
      });

      if (insertError) {
        throw insertError;
      }

      projectMessage.textContent = "Project added successfully!";

      projectForm.reset();

      await loadDashboard();
    } catch (error) {
      console.error("Project upload error:", error);

      // Remove uploaded image if saving the project failed

      if (uploadedFilePath) {
        await supabase.storage
          .from("project-images")
          .remove([uploadedFilePath]);
      }

      projectMessage.textContent = error.message || "Something went wrong.";
    } finally {
      saveProjectButton.disabled = false;
      saveProjectButton.textContent = "Add Project";
    }
  });
  // Update statistics

  totalProjects.textContent = projects.length;

  graphicProjects.textContent = projects.filter(
    (project) => project.category === "graphic",
  ).length;

  videoProjects.textContent = projects.filter(
    (project) => project.category === "video",
  ).length;

  // Display project list

  if (projects.length === 0) {
    adminProjectList.textContent = "No projects found.";
    return;
  }

  adminProjectList.innerHTML = projects
    .map(
      (project) => `

    <div class="admin-project-card">

    <img
        src="${project.image_url || ""}"
        alt="${project.title}"
    >

    <div class="admin-project-details">
        <h3>${project.title}</h3>
        <span>${project.category}</span>
    </div>

    <button
        class="edit-project-btn"
        data-id="${project.id}"
    >
        Edit
    </button>

    <button
        class="delete-project-btn"
        data-id="${project.id}"
        data-image="${project.image_url || ""}"
    >
        Delete
    </button>

</div>

`,
    )
    .join("");
}
// DELETE PROJECT

adminProjectList.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest(".delete-project-btn");

  if (!deleteButton) return;

  const projectId = Number(deleteButton.dataset.id);
  const imageUrl = deleteButton.dataset.image;

  const confirmed = confirm("Are you sure you want to delete this project?");

  if (!confirmed) return;

  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";

  try {
    // Delete database record

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;

    // Remove thumbnail from Storage

    if (imageUrl) {
      const marker = "/project-images/";
      const imageIndex = imageUrl.indexOf(marker);

      if (imageIndex !== -1) {
        const imagePath = decodeURIComponent(
          imageUrl.substring(imageIndex + marker.length),
        );

        const { error: storageError } = await supabase.storage
          .from("project-images")
          .remove([imagePath]);

        if (storageError) {
          console.error("Image deletion error:", storageError.message);
        }
      }
    }

    alert("Project deleted successfully!");

    await loadDashboard();
  } catch (error) {
    console.error("Delete error:", error.message);

    alert("Unable to delete project: " + error.message);

    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
});
// 3. LOGOUT

logoutButton.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "/admin.html";
});

// 4. START DASHBOARD

const authenticated = await checkAuthentication();

if (authenticated) {
  loadDashboard();
}
// DASHBOARD NAVIGATION

const navigationLinks = document.querySelectorAll(".sidebar nav a");

navigationLinks.forEach((link) => {
  link.addEventListener("click", () => {
    navigationLinks.forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});
// EDIT PROJECT

const editProjectModal = document.getElementById("editProjectModal");
const editProjectForm = document.getElementById("editProjectForm");
const closeEditModal = document.getElementById("closeEditModal");
const updateProjectButton = document.getElementById("updateProjectButton");
const editMessage = document.getElementById("editMessage");

let currentEditImageUrl = "";

// Open modal and load project information

adminProjectList.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-project-btn");

  if (!editButton) return;

  const projectId = Number(editButton.dataset.id);

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    alert("Unable to load project: " + error.message);
    return;
  }

  // Fill the form with existing information

  document.getElementById("editProjectId").value = project.id;
  document.getElementById("editTitle").value = project.title;
  document.getElementById("editCategory").value = project.category;
  document.getElementById("editDescription").value = project.description || "";
  document.getElementById("editYoutubeUrl").value = project.youtube_url || "";
  document.getElementById("editOrientation").value =
    project.video_orientation || "landscape";

  currentEditImageUrl = project.image_url || "";

  document.getElementById("editImage").value = "";

  editMessage.textContent = "";

  editProjectModal.classList.add("active");
});

// Close modal

closeEditModal.addEventListener("click", () => {
  editProjectModal.classList.remove("active");
});

editProjectModal.addEventListener("click", (event) => {
  if (event.target === editProjectModal) {
    editProjectModal.classList.remove("active");
  }
});

// Save changes

editProjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const projectId = Number(document.getElementById("editProjectId").value);

  const title = document.getElementById("editTitle").value.trim();
  const category = document.getElementById("editCategory").value;
  const description = document.getElementById("editDescription").value.trim();
  const youtubeUrl = document.getElementById("editYoutubeUrl").value.trim();
  const orientation = document.getElementById("editOrientation").value;
  const newImage = document.getElementById("editImage").files[0];

  if (newImage && newImage.size > 5 * 1024 * 1024) {
    editMessage.textContent = "Image must be smaller than 5 MB.";
    return;
  }

  updateProjectButton.disabled = true;
  updateProjectButton.textContent = "Saving...";
  editMessage.textContent = "";

  let newImagePath = null;

  try {
    let imageUrl = currentEditImageUrl;

    // Upload replacement image if selected

    if (newImage) {
      const extension = newImage.name.split(".").pop();
      newImagePath = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(newImagePath, newImage, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: imageData } = supabase.storage
        .from("project-images")
        .getPublicUrl(newImagePath);

      imageUrl = imageData.publicUrl;
    }

    // Update database record

    const { error: updateError } = await supabase
      .from("projects")
      .update({
        title,
        category,
        description,
        image_url: imageUrl,
        youtube_url: youtubeUrl || null,
        video_orientation: orientation,
      })
      .eq("id", projectId);

    if (updateError) throw updateError;

    // Remove old image after successful update

    if (newImage && currentEditImageUrl) {
      const marker = "/project-images/";
      const imageIndex = currentEditImageUrl.indexOf(marker);

      if (imageIndex !== -1) {
        const oldImagePath = decodeURIComponent(
          currentEditImageUrl.substring(imageIndex + marker.length),
        );

        const { error: removeError } = await supabase.storage
          .from("project-images")
          .remove([oldImagePath]);

        if (removeError) {
          console.error("Old image removal error:", removeError.message);
        }
      }
    }

    editMessage.textContent = "Project updated successfully!";

    await loadDashboard();

    setTimeout(() => {
      editProjectModal.classList.remove("active");
    }, 1000);
  } catch (error) {
    console.error("Update error:", error);

    // Clean up replacement image if database update failed

    if (newImagePath) {
      await supabase.storage.from("project-images").remove([newImagePath]);
    }

    editMessage.textContent = error.message || "Unable to update project.";
  } finally {
    updateProjectButton.disabled = false;
    updateProjectButton.textContent = "Save Changes";
  }
});
