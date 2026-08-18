import { request, DASHBOARD_URL } from "@/lib/api";

export async function searchAll(user_email, keyword) {
  return request(`${DASHBOARD_URL}/service/search`, {
    method: "POST",
    body: JSON.stringify({ function: 'searchAll', values: { user_email, keyword } }),
  });
}

export async function searchProject(user_email, project_name, keyword) {
  return request(`${DASHBOARD_URL}/service/search`, {
    method: "POST",
    body: JSON.stringify({ function: 'searchProject', values: { user_email, project_name, keyword } }),
  });
}

export async function searchProjects(user_email, keyword) {
  return request(`${DASHBOARD_URL}/service/search`, {
    method: "POST",
    body: JSON.stringify({ function: 'searchProjects', values: { user_email, keyword } }),
  });
}
