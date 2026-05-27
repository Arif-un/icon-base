import { createFileRoute } from "@tanstack/react-router";
import { Button, Modal } from "antd";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="">
      <Button type="primary" className="bg-slate-700" onClick={showModal}>
        Click Me
      </Button>
      <Modal title="Basic Modal" open={isModalOpen} onOk={handleOk} onCancel={handleCancel}>
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
      </Modal>
      
      <h1>Dashboard</h1>
      <p>Welcome to Icon Base Plugin. Your plugin is active and running successfully.</p>
    </div>
  );
}
