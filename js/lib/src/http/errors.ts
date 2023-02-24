export async function handleResponse(res: Response): Promise<any> {
  if (res.status !== 200) {
    throw new Error(`${await res.text()}`);
  }

  return await res.json();
}
