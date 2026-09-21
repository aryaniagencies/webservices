//import { getConfig, requireConfig } from "../../../config/index.js";
//import { addToDatabase, dbhandler } from "../dbhandler/index.js";
//import { cloudmanager } from "../cloud/index.js";


export const communicationmanager = {

  handlerequest(params) {

    handlerequest: async (c) => {
    // Incoming Request Object (Native Web Request)
    const rawRequest = c.req.raw 
    
    // Body, headers, URL direct read kar sakte ho
    const url = c.req.url
    const method = c.req.method

    // switch

    // Response return kar do
    return c.json({
      status: "success",
      message: "Request directly processed by Communication Manager!",
      path: url
    })
  }
  },
  
  async comms(req) {

    const attachment='';
    const timestamp = new Date().toISOString();
    
    // Upload to cloudinary if attachment exists
    // const attachurl = body['attachment'] ? await cloudmanager.uploaditem(attachment, "cloudinary", { folder: "attachments" }) : null;
    /* if (attachment && attachment instanceof File) {

      // Agar file ka binary buffer/content chahiye:
      const arrayBuffer = await attachment.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Yahan se buffer ko S3, Cloudinary par upload kar sakte ho
      cloudmanager.upadloaditem(attachment, "cloudinary")
    }
    // add to database
    /* await addToDatabase(
      {
        req.header('name'),
        req.header('email'),
        req.header('phone'),
        req.header('regarding'),
        req.body,
        attachment: attachurl || null,
      }
    );

    */
    const adminHtml = `
      <div style="text-align: center;">
        <h1 style="color: pink;">New Message Received from: ${req.header('name')}</h1>
        <small> Received at: ${timestamp}</small><br/><br/>
        <p>${req.text()}</p><br/>
        <p>Email: ${req.header('email')}</p>
        <p>Phone: ${req.header('phone')}</p><br/>
      </div>
    `;
    // <p>Attachment: ${attachurl ? `<a href="${google.com}">View Attachment</a>` : "No attachment"}</p>
    
    return env.EMAIL.send(
      {
        from: req.header('sender'),
        to: env.ADMIN_EMAIL,
        subject: `New Message Received from ${req.header('name')} regarding: ${req.header('subject')}`,
        html: adminHtml
      }
    );
  },

  async subscribe(email) {

    // add a database entry to the subscribers list database
    dbhandler.addDatabaseEntry(any , {email});
  }

};

export const socialmediamanager = {
  
  async SchedulePost(content, time, platforms) {

    // Schedule a post to be published on social media platforms at a specified time

  }, 

  async AutomatedMessages(platform, user, message, time) {

    // Send automated messages to users on social media platforms at a specified time

    // if user is "all", send to all users in inbox
  },

};

export const media = {socialmediamanager, communicationmanager};
