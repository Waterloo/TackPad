<template>
  <div class="page-container">
    <!-- Logo and Header -->
    <div class="header">
      <div class="logo-container">
        <div class="logo">T</div>
      </div>
      <h1 class="title">Authorize Access to Tackpad</h1>
    </div>

    <!-- Main Card -->
    <div class="card">
      <!-- App Info -->
      <div class="card-section">
        <div class="app-info">
          <div class="app-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="color: #6b7280"
            >
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              ></path>
            </svg>
          </div>
          <div>
            <h2 class="app-name">{{ application.name }}</h2>
            <p class="app-publisher">by {{ application.publisher }}</p>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div class="card-section">
        <h3 class="permissions-title">This application will be able to:</h3>
        <ul class="permissions-list">
          <li
            v-for="(permission, index) in permissions"
            :key="index"
            class="permission-item"
          >
            <svg
              class="permission-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="permission-text">{{ permission }}</span>
          </li>
        </ul>
        <p class="permission-note">
          {{ application.name }} will not be able to access your account
          password or personal information.
        </p>
      </div>

      <!-- Account Info -->
      <div class="card-section account-section hidden">
        <div class="account-container">
          <div class="account-info">
            <div class="account-avatar">{{ userInitials }}</div>
            <div>
              <p class="account-name">{{ user.name }}</p>
              <p class="account-email">{{ user.email }}</p>
            </div>
          </div>
          <button type="button" class="switch-btn" @click="switchAccount">
            Switch account
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="card-section">
        <div class="actions-container">
          <div class="buttons-container">
            <a :href="authUrl" class="btn btn-primary" target="_blank">
              Authorize
            </a>
            <button type="button" class="btn btn-secondary" @click="cancel">
              Cancel
            </button>
          </div>
          <div>
            <a href="#" class="report-link" @click.prevent="reportApplication">
              Report this application
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        By authorizing this application, you agree to Tackpad's
        <a href="#" @click.prevent="showTerms">Terms of Service</a> and
        <a href="#" @click.prevent="showPrivacy">Privacy Policy</a>.
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "OAuthAuthorize",
  props: {
    // Application requesting authorization
    application: {
      type: Object,
      required: true,
      default: () => ({
        name: "Tackpad Telegram",
        publisher: "Tackpad",
        client_id: "",
        redirect_uri: "",
        scope: "",
      }),
    },
    // Current user info
    user: {
      type: Object,
      required: true,
      default: () => ({
        name: "Jane Doe",
        email: "jane.doe@example.com",
      }),
    },
  },
  data() {
    return {
      // Permissions that will be granted
      permissions: [
        "View your boards and items",
        "Create new notes and todo lists",
        "Edit your existing items",
      ],
    };
  },
  computed: {
    authUrl() {
      try {
        const token = Object.values(JSON.parse(localStorage.settings))[0]
          .user_token;
        return `https://t.me/tackpadbot?start=${token}`;
      } catch (e) {
        console.log(e)
      }
    },
    // Get user initials for avatar
    userInitials() {
      if (!this.user.name) return "?";
      return this.user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    },
  },
  methods: {
    // Handle authorization
    authorize() {
      this.$emit("authorize", {
        client_id: this.application.client_id,
        redirect_uri: this.application.redirect_uri,
        scope: this.application.scope,
      });
    },
    // Handle rejection
    cancel() {
      this.$emit("cancel");
    },
    // Switch user account
    switchAccount() {
      this.$emit("switch-account");
    },
    // Report application
    reportApplication() {
      this.$emit("report", this.application.client_id);
    },
    // Show terms of service
    showTerms() {
      this.$emit("show-terms");
    },
    // Show privacy policy
    showPrivacy() {
      this.$emit("show-privacy");
    },
  },
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background-color: #f9fafb;
}

/* Header styles */
.header {
  margin-bottom: 2rem;
  text-align: center;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.logo {
  width: 3rem;
  height: 3rem;
  background-color: #4f46e5;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #111827;
}

/* Card styles */
.card {
  width: 100%;
  max-width: 28rem;
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.card-section {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

/* App info styles */
.app-info {
  display: flex;
  align-items: center;
}

.app-icon {
  height: 3rem;
  width: 3rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
}

.app-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.app-publisher {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Permissions styles */
.permissions-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 1rem;
}

.permissions-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.permission-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #10b981;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.permission-text {
  font-size: 0.875rem;
  color: #4b5563;
}

.permission-note {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

/* Account info styles */
.account-section {
  background-color: #f9fafb;
}

.account-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.account-info {
  display: flex;
  align-items: center;
}

.account-avatar {
  height: 2.5rem;
  width: 2.5rem;
  background-color: #e0e7ff;
  color: #4f46e5;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 0.75rem;
}

.account-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.account-email {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.switch-btn {
  font-size: 0.75rem;
  color: #4f46e5;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.switch-btn:hover {
  color: #4338ca;
}

/* Actions styles */
.actions-container {
  display: flex;
  flex-direction: column;
}

.buttons-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: center;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  margin-bottom: 0.75rem;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.report-link {
  font-size: 0.75rem;
  color: #6b7280;
  text-decoration: none;
}

.report-link:hover {
  color: #4b5563;
}

/* Footer styles */
.footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.75rem;
  color: #6b7280;
}

.footer a {
  color: #4f46e5;
  text-decoration: none;
}

.footer a:hover {
  color: #4338ca;
}

/* Media queries for responsive design */
@media (min-width: 640px) {
  .actions-container {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .buttons-container {
    flex-direction: row;
    margin-bottom: 0;
  }

  .btn-primary {
    margin-bottom: 0;
    margin-left: 0.75rem;
    order: 2;
  }

  .btn-secondary {
    order: 1;
  }
}
</style>
