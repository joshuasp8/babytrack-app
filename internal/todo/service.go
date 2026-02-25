package todo

import (
	"time"

	"github.com/google/uuid"
)

type TodoService struct {
	repository TodoRepository
}

func NewService(repository TodoRepository) *TodoService {
	return &TodoService{
		repository: repository,
	}
}

func (this *TodoService) GetById(id uuid.UUID) (*Todo, error) {
	todo, err := this.repository.FindByID(id)
	if err != nil {
		return nil, err
	}
	return todo, nil
}

func (this *TodoService) GetAll() ([]*Todo, error) {
	todos, err := this.repository.FindAll()
	if err != nil {
		return nil, err
	}
	return todos, nil
}

func (this *TodoService) Create(request *CreateTodoRequest) (*Todo, error) {
	todo := &Todo{
		Id:        uuid.New(),
		CreatedAt: time.Now().UTC(),
		Title:     request.Title,
		Completed: false,
	}

	err := this.repository.Save(todo)
	if err != nil {
		return nil, err
	}
	return todo, nil
}

func (this *TodoService) Update(id uuid.UUID, request *UpdateTodoRequest) (*Todo, error) {
	todo, err := this.repository.FindByID(id)
	if err != nil {
		return nil, err
	}

	// apply updates
	todo.Title = request.Title
	todo.Completed = request.Completed

	err = this.repository.Save(todo)
	if err != nil {
		return nil, err
	}
	return todo, nil
}

func (this *TodoService) Delete(id uuid.UUID) error {
	_, err := this.repository.FindByID(id)
	if err != nil {
		return err
	}

	err = this.repository.Delete(id)
	if err != nil {
		return err
	}
	return nil
}
