(() => {
  "use strict";

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const intro = document.querySelector("#intro-loader");
  const skipIntro = document.querySelector("#skip-intro");
  let introClosed = false;

  const closeIntro = () => {
    if (!intro || introClosed) return;
    introClosed = true;
    intro.classList.add("is-gone");
    try {
      window.sessionStorage.setItem("edmor-intro-seen", "true");
    } catch (_) {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    window.setTimeout(() => intro.remove(), 900);
  };

  let hasSeenIntro = false;
  try {
    hasSeenIntro = window.sessionStorage.getItem("edmor-intro-seen") === "true";
  } catch (_) {
    hasSeenIntro = false;
  }

  if (hasSeenIntro || prefersReducedMotion) {
    closeIntro();
  } else {
    window.addEventListener("load", () => window.setTimeout(closeIntro, 450), { once: true });
    window.setTimeout(closeIntro, 1800);
  }
  skipIntro?.addEventListener("click", closeIntro);

  const progressBar = document.querySelector("#scroll-progress");
  const story = document.querySelector("#signal-story");
  const storySteps = [...document.querySelectorAll("[data-story-step]")];
  const signalWindow = document.querySelector(".signal-window");
  let scrollFrame = 0;

  const interpolateShape = (progress) => {
    const maxWidth = Math.min(580, window.innerWidth * 0.45);
    const keyframes = [
      { at: 0, width: Math.min(285, maxWidth), height: 360, radius: 42, rotation: -7 },
      { at: 0.34, width: Math.min(370, maxWidth), height: 370, radius: 190, rotation: 0 },
      { at: 0.68, width: Math.min(500, maxWidth), height: 340, radius: 105, rotation: 5 },
      { at: 1, width: maxWidth, height: 315, radius: 26, rotation: 0 },
    ];

    const rightIndex = Math.min(
      keyframes.length - 1,
      keyframes.findIndex((frame) => frame.at >= progress) === -1
        ? keyframes.length - 1
        : keyframes.findIndex((frame) => frame.at >= progress)
    );
    const leftIndex = Math.max(0, rightIndex - 1);
    const left = keyframes[leftIndex];
    const right = keyframes[rightIndex];
    const distance = right.at - left.at || 1;
    const local = clamp((progress - left.at) / distance);
    const mix = (start, end) => start + (end - start) * local;

    return {
      width: mix(left.width, right.width),
      height: mix(left.height, right.height),
      radius: mix(left.radius, right.radius),
      rotation: mix(left.rotation, right.rotation),
    };
  };

  const updateScrollEffects = () => {
    scrollFrame = 0;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pageProgress = documentHeight > 0 ? window.scrollY / documentHeight : 0;
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(pageProgress)})`;

    if (!story || !signalWindow || window.innerWidth <= 700 || prefersReducedMotion) return;
    const storyRect = story.getBoundingClientRect();
    const storyDistance = story.offsetHeight - window.innerHeight;
    const storyProgress = storyDistance > 0 ? clamp(-storyRect.top / storyDistance) : 0;
    story.style.setProperty("--story-progress", storyProgress.toFixed(4));

    const shape = interpolateShape(storyProgress);
    signalWindow.style.setProperty("--shape-w", `${shape.width.toFixed(1)}px`);
    signalWindow.style.setProperty("--shape-h", `${shape.height.toFixed(1)}px`);
    signalWindow.style.setProperty("--shape-r", `${shape.radius.toFixed(1)}px`);
    signalWindow.style.setProperty("--shape-rot", `${shape.rotation.toFixed(2)}deg`);

    const activeStep = Math.min(storySteps.length - 1, Math.floor(storyProgress * storySteps.length));
    storySteps.forEach((step, index) => step.classList.toggle("is-active", index === activeStep));
  };

  const requestScrollUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollEffects();

  const hero = document.querySelector(".hero");
  if (hero && !prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 38;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 38;
      hero.style.setProperty("--hero-x", x.toFixed(2));
      hero.style.setProperty("--hero-y", y.toFixed(2));
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", 0);
      hero.style.setProperty("--hero-y", 0);
    });
  }

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");
  if (dot && ring && window.matchMedia("(pointer: fine)").matches && !prefersReducedMotion) {
    document.body.classList.add("custom-cursor-enabled");
    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;

    document.addEventListener("pointermove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      document.body.classList.add("has-cursor");
    });
    document.addEventListener("pointerleave", () => document.body.classList.remove("has-cursor"));

    document.querySelectorAll("a, button, .app-deck").forEach((target) => {
      target.addEventListener("pointerenter", () => document.body.classList.add("cursor-hover"));
      target.addEventListener("pointerleave", () => document.body.classList.remove("cursor-hover"));
    });

    const renderCursor = () => {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      window.requestAnimationFrame(renderCursor);
    };
    renderCursor();
  }

  const appScreens = [...document.querySelectorAll("[data-app-screen]")];
  const appTabs = [...document.querySelectorAll("[data-app-index]")];
  const appDeck = document.querySelector("#app-deck");
  const appCurrent = document.querySelector("#app-current");
  const appLabel = document.querySelector("#app-label");
  const appTitle = document.querySelector("#app-title");
  const appDescription = document.querySelector("#app-description");
  const appPrev = document.querySelector("#app-prev");
  const appNext = document.querySelector("#app-next");
  const appCopy = [
    {
      label: "DISCOVER TOGETHER",
      title: "探索彼此的毛孩日常",
      description: "在動態牆記錄生活、找到同頻夥伴，讓陪伴從一段內容開始。",
    },
    {
      label: "NEARBY CONNECTION",
      title: "讓附近，成為相遇的起點",
      description: "透過地圖發現鄰近毛孩與新朋友，把線上互動延伸到真實生活。",
    },
    {
      label: "BEHAVIOR INSIGHT",
      title: "看見行為背後的訊號",
      description: "整合日常記錄與影像分析，協助飼主掌握情緒與行為變化。",
    },
    {
      label: "PET IDENTITY",
      title: "每隻毛孩，都有自己的故事",
      description: "集中整理個性、興趣與生活紀錄，建立獨一無二的毛孩檔案。",
    },
    {
      label: "SOCIAL MOMENT",
      title: "從一句話，開始新的連結",
      description: "用即時聊天延續社群互動，讓飼主與毛孩一起找到新夥伴。",
    },
    {
      label: "AI ICEBREAKER",
      title: "AI 幫你找到自然的開場白",
      description: "根據彼此的毛孩資料提供破冰靈感，降低第一次互動的尷尬感。",
    },
    {
      label: "OFFLINE EXPERIENCE",
      title: "把興趣變成一起參與的活動",
      description: "探索適合毛孩的聚會與體驗，讓數位關係回到真實的共同記憶。",
    },
  ];
  let activeApp = 0;
  let appVisible = false;
  let appPaused = false;
  let dragStart = null;

  const normalizeOffset = (index, active, total) => {
    let offset = index - active;
    const halfway = Math.floor(total / 2);
    if (offset > halfway) offset -= total;
    if (offset < -halfway) offset += total;
    return offset;
  };

  const renderApp = (nextIndex, userInitiated = false) => {
    if (!appScreens.length) return;
    activeApp = (nextIndex + appScreens.length) % appScreens.length;
    const mobile = window.innerWidth <= 700;

    appScreens.forEach((screen, index) => {
      const offset = normalizeOffset(index, activeApp, appScreens.length);
      const distance = Math.abs(offset);
      const xUnit = mobile ? 44 : 58;
      screen.style.setProperty("--screen-x", `${offset * xUnit}%`);
      screen.style.setProperty("--screen-y", `${distance * (mobile ? 13 : 18)}px`);
      screen.style.setProperty("--screen-rotate", `${offset * -9}deg`);
      screen.style.setProperty("--screen-scale", Math.max(0.68, 1 - distance * 0.105).toFixed(3));
      screen.style.setProperty("--screen-opacity", distance > 3 ? "0" : String(Math.max(0.18, 1 - distance * 0.25)));
      screen.style.setProperty("--screen-z", String(appScreens.length - distance));
      screen.classList.toggle("is-active", index === activeApp);
      screen.setAttribute("aria-hidden", String(index !== activeApp));
    });

    appTabs.forEach((tab, index) => {
      const active = index === activeApp;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    const copy = appCopy[activeApp];
    if (appCurrent) appCurrent.textContent = String(activeApp + 1).padStart(2, "0");
    if (appLabel) appLabel.textContent = copy.label;
    if (appTitle) appTitle.textContent = copy.title;
    if (appDescription) appDescription.textContent = copy.description;
    if (userInitiated) appTabs[activeApp]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  appTabs.forEach((tab) => {
    tab.addEventListener("click", () => renderApp(Number(tab.dataset.appIndex), true));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      renderApp(activeApp + (event.key === "ArrowRight" ? 1 : -1), true);
      appTabs[activeApp]?.focus();
    });
  });
  appPrev?.addEventListener("click", () => renderApp(activeApp - 1, true));
  appNext?.addEventListener("click", () => renderApp(activeApp + 1, true));

  appDeck?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") renderApp(activeApp - 1, true);
    if (event.key === "ArrowRight") renderApp(activeApp + 1, true);
  });
  appDeck?.addEventListener("pointerdown", (event) => {
    dragStart = event.clientX;
    appDeck.setPointerCapture?.(event.pointerId);
    appPaused = true;
  });
  appDeck?.addEventListener("pointerup", (event) => {
    if (dragStart === null) return;
    const distance = event.clientX - dragStart;
    if (Math.abs(distance) > 45) renderApp(activeApp + (distance < 0 ? 1 : -1), true);
    dragStart = null;
    appPaused = false;
  });
  appDeck?.addEventListener("pointercancel", () => {
    dragStart = null;
    appPaused = false;
  });

  const appExperience = document.querySelector(".app-experience");
  if (appExperience) {
    appExperience.addEventListener("mouseenter", () => { appPaused = true; });
    appExperience.addEventListener("mouseleave", () => { appPaused = false; });
    appExperience.addEventListener("focusin", () => { appPaused = true; });
    appExperience.addEventListener("focusout", () => { appPaused = false; });
    new IntersectionObserver(([entry]) => { appVisible = entry.isIntersecting; }, { threshold: 0.45 }).observe(appExperience);
  }

  renderApp(0);
  if (!prefersReducedMotion) {
    window.setInterval(() => {
      if (appVisible && !appPaused) renderApp(activeApp + 1);
    }, 4800);
  }
  window.addEventListener("resize", () => renderApp(activeApp), { passive: true });

  const teamCards = [...document.querySelectorAll(".team-card")];
  const teamDetail = document.querySelector("#team-detail");
  const teamFields = {
    zh: document.querySelector("#team-detail-zh"),
    name: document.querySelector("#team-detail-name"),
    role: document.querySelector("#team-detail-role"),
    bio: document.querySelector("#team-detail-bio"),
    edu: document.querySelector("#team-detail-edu"),
    exp: document.querySelector("#team-detail-exp"),
    index: document.querySelector(".team-detail__top span:first-child"),
  };

  const selectMember = (card, index, shouldScroll = false) => {
    if (!card || !teamDetail) return;
    teamCards.forEach((item) => {
      const active = item === card;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });

    teamDetail.classList.remove("is-changing");
    void teamDetail.offsetWidth;
    teamDetail.classList.add("is-changing");
    teamFields.zh.textContent = card.dataset.name || "";
    teamFields.name.textContent = card.dataset.en || "";
    teamFields.role.textContent = card.dataset.role || "";
    teamFields.bio.textContent = card.dataset.bio || "";
    teamFields.edu.textContent = card.dataset.edu || "";
    teamFields.exp.textContent = card.dataset.exp || "";
    teamFields.index.textContent = `SELECTED MEMBER / ${String(index + 1).padStart(2, "0")}`;
    window.setTimeout(() => teamDetail.classList.remove("is-changing"), 450);

    if (shouldScroll && window.innerWidth <= 700) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  teamCards.forEach((card, index) => {
    card.addEventListener("click", () => selectMember(card, index, true));
  });
})();
