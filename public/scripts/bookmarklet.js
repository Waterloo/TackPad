if(!window.myScriptConfig) {
    console.error("myScriptConfig not found");
  } else {
    const boardUrl = `${window.myScriptConfig.baseUrl}/api/board/${window.myScriptConfig.boardId}`;
    const boardSaveUrl = `${window.myScriptConfig.baseUrl}/api/save/${window.myScriptConfig.boardId}`;
    const bookmarkUrl = `${window.myScriptConfig.baseUrl}/api/bookmark/${window.myScriptConfig.boardId}`;

    let boardEncrypted = false;

    // Fetch board data
    fetch(boardUrl,{
        method:"GET"
    })
    .then(response => response.json()) 
      .then(board => {
        console.log(board)
        if (!board.data) {
          console.error("No board data found");
        } else {
          if (board.data.encrypted) {
            boardEncrypted = true;
          }
          
          if (boardEncrypted) {
            // Get password from user
            const password = prompt("Please enter your board password:", "");
            if (password) {
              try {
                // Decrypt board using the available decrypt function
                const decryptedData = decrypt(board.data.content, password);
                
                // Parse the decrypted data
                const boardData = JSON.parse(decryptedData);
                
                // Define item dimensions
                const dimensions = {
                  width: 300,
                  height: 320
                };
                
                // Find available position
                const position = findAvailablePosition(boardData, dimensions);
                
                // Generate ID for the new link
                const linkId = 'LINK-' + Math.random().toString(36).substring(2, 12).toUpperCase();
                
                // Create link item with proper structure
                const linkItem = {
                  id: linkId,
                  kind: 'link',
                  content: { url: window.location.href },
                  x_position: position.x,
                  y_position: position.y,
                  width: dimensions.width,
                  height: dimensions.height
                };
                
                // Add new link item to board
                boardData.items = [...(boardData.items || []), linkItem];
                
                // Encrypt using the available encrypt function
                const encryptedData = encrypt(JSON.stringify(boardData), password);
                
                // Save the encrypted board
                fetch(boardSaveUrl, {
                  method: 'POST',
                  body: JSON.stringify({
                    encrypted: true,
                    content: encryptedData
                  }),
                  
                  headers: {'Content-Type': 'application/json'}
                })
                .then(response => {
                  if (response.ok) {
                    showBookmarkToast();
                  }
                });
              } catch (error) {
                alert("Error processing encrypted board: " + error.message);
              }
            }
          } else {
            // Call bookmark with link for non-encrypted boards
            fetch(bookmarkUrl, {
              method: 'POST',

              body: JSON.stringify({ link: window.location.href }),
              headers: {'Content-Type': 'application/json'}
            })
            .then(response => {
              if (response.ok) {
                showBookmarkToast();
              }
            });
          }
        }
      })
      .catch(error => {
        console.error("Error fetching board:", error);
      });
  }

  // Function to show bookmark toast notification
  function showBookmarkToast() {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('custom-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'custom-toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px 24px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      min-width: 250px;
      animation: slideIn 0.3s ease-in-out;
    `;

    // Add success icon
    const icon = document.createElement('span');
    icon.innerHTML = '✓';
    icon.style.cssText = `
      color: #22C55E;
      margin-right: 12px;
      font-size: 20px;
    `;

    // Add message container
    const messageContainer = document.createElement('div');
    messageContainer.style.cssText = `
      flex-grow: 1;
    `;

    // Add title
    const title = document.createElement('div');
    title.textContent = 'Bookmarked';
    title.style.cssText = `
      font-weight: 600;
      font-size: 16px;
      color: #1a1a1a;
    `;

    // Add message
    const message = document.createElement('div');
    message.textContent = 'You can access bookmark from the board';
    message.style.cssText = `
      font-size: 14px;
      color: #666;
      margin-top: 2px;
    `;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: #999;
      font-size: 20px;
      cursor: pointer;
      padding: 0 0 0 12px;
    `;
    closeButton.onclick = () => toast.remove();

    // Add styles for animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Assemble toast
    messageContainer.appendChild(title);
    messageContainer.appendChild(message);
    toast.appendChild(icon);
    toast.appendChild(messageContainer);
    toast.appendChild(closeButton);
    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.remove();
      if (toastContainer.childNodes.length === 0) {
        toastContainer.remove();
        style.remove();
      }
    }, 3000);
  }

// Convert string to ArrayBuffer
const str2ab =(str)=>  new TextEncoder().encode(str);

// Convert ArrayBuffer to string
const ab2str = (buf)=> new TextDecoder().decode(buf);

// Convert ArrayBuffer to base64 string
const ab2base64 = (buf)=> btoa(String.fromCharCode(...new Uint8Array(buf)));

// Convert base64 string to ArrayBuffer
const base642ab = (base64) => {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
};



async function encrypt(data, password){
  try {
    // Convert object to string
    const jsonString = JSON.stringify(data);
    
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      str2ab(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the stringified data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      str2ab(jsonString)
    );
    
    // Combine salt, IV, and encrypted data
    const result = {
      salt: ab2base64(salt),
      iv: ab2base64(iv),
      encrypted: ab2base64(encrypted)
    };
    
    return result;
  } catch (err) {
    throw new Error('Encryption failed: ' + err.message);
  }
}

async function decrypt(encryptedData, password){
  try {
    // Convert base64 strings back to ArrayBuffers
    const salt = base642ab(encryptedData.salt);
    const iv = base642ab(encryptedData.iv);
    const encrypted = base642ab(encryptedData.encrypted);
    
    // Derive the same key from password
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      str2ab(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encrypted
    );
    
    // Parse the decrypted string back to an object
    const jsonString = ab2str(decrypted);
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Decryption failed: ' + err.message);
  }
}
