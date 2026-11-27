import { supabase } from "../supabase/supabase.js";

// Store projects retrieved from Supabase
let projects = [];

const gallery = document.getElementById("projectGallery");

// 1. LOAD PROJECTS FROM SUPABASE

async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading projects:", error.message);
    gallery.innerHTML = "<p>Unable to load projects.</p>";
    return;
  }

  projects = data || [];

  displayProjects();
}

// 2. DISPLAY PROJECTS

function displayProjects(category = "all") {
  const filteredProjects =
    category === "all"
      ? projects
      : projects.filter((project) => project.category === category);

  gallery.innerHTML = filteredProjects
    .map(
      (project) => `
        <article class="project-card" data-id="${project.id}">

            <div class="project-image">
                <img src="${project.image_url}" alt="${project.title}">
            </div>

            <div class="project-info">
                <span class="project-type">
    ${
      project.category === "graphic"
        ? "Graphic Design"
        : project.category === "branding"
          ? "Brand Identity"
          : "Video Editing"
    }
</span>

                <h3>${project.title}</h3>

                <p>${project.description || ""}</p>
            </div>

        </article>
    `,
    )
    .join("");

  // Add click events to project cards

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      const project = projects.find(
        (item) => item.id === Number(card.dataset.id),
      );

      if (project) {
        openProject(project);
      }
    });
  });
}

// 3. OPEN PROJECT DETAILS

function openProject(project) {
  const modal = document.createElement("div");

  modal.className = "project-modal";

  let mediaContent = `
        <img src="${project.image_url}" alt="${project.title}">
    `;

  // Check whether the project contains a YouTube video

  if (project.youtube_url) {
    const url = new URL(project.youtube_url);

    const videoId = url.pathname.includes("/shorts/")
      ? url.pathname.split("/shorts/")[1].split("/")[0]
      : url.searchParams.get("v") || url.pathname.split("/").pop();

    const orientation = project.video_orientation || "landscape";

    mediaContent = `
            <div class="video-container ${orientation}">

                <iframe
                    src="https://www.youtube-nocookie.com/embed/${videoId}"
                    title="${project.title}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>

            </div>
        `;
  }

  modal.innerHTML = `
        <div class="modal-content">

            <button class="modal-close">&times;</button>

            ${mediaContent}

            <span class="project-type">
    ${
      project.category === "graphic"
        ? "Graphic Design"
        : project.category === "branding"
          ? "Brand Identity"
          : "Video Editing"
    }
</span>

            <h2>${project.title}</h2>

            <p>${project.description || ""}</p>

        </div>
    `;

  document.body.appendChild(modal);

  // Close button

  modal.querySelector(".modal-close").addEventListener("click", () => {
    modal.remove();
  });

  // Close when clicking outside the modal

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
}

// 4. FILTER PROJECTS

document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter-btn.active")?.classList.remove("active");

    button.classList.add("active");

    displayProjects(button.dataset.category);
  });
});

// 5. LOAD PROJECTS WHEN WEBSITE STARTS

loadProjects();
